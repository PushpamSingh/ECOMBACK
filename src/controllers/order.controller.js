import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Transaction from '../models/Transaction.js';
import SiteSettings from '../models/SiteSettings.js';
import { env } from '../config/env.js';
import { lineUnitPrice, couponDiscount, computeTotals } from '../utils/pricing.js';
import { createRazorpayOrder, isRazorpayConfigured } from '../services/razorpay.service.js';
import { reserveStock } from '../services/inventory.service.js';
import { containsFilter } from '../utils/sanitize.js';
import { getCommissionPercentage, computeLineCommission } from '../services/commission.service.js';
import { creditSellerPending, reverseOrderCredits } from '../services/settlement.service.js';

// Places an order from the user's current cart.
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, couponCode } = req.body;

  const settings = await SiteSettings.getSettings();
  if (!settings.paymentMethods[paymentMethod]) {
    throw new ApiError(400, 'Payment method is not available');
  }

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  const items = (cart?.items || []).filter((i) => i.product);
  if (items.length === 0) throw new ApiError(400, 'Your cart is empty');

  // Commission rate is read ONCE here and snapshotted onto each marketplace line.
  const commissionPercentage = await getCommissionPercentage();

  // Build order lines from live product data and validate stock.
  const orderItems = [];
  let subtotal = 0;
  for (const item of items) {
    const p = item.product;
    if (p.stock < item.quantity) throw new ApiError(400, `Insufficient stock for ${p.name}`);
    const unitPrice = lineUnitPrice(p);
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;

    const line = {
      product: p._id,
      name: p.name,
      image: p.thumbnail || p.images?.[0] || '',
      price: unitPrice,
      quantity: item.quantity,
    };

    // Marketplace line: snapshot seller economics permanently (never recalculated).
    if (p.source === 'marketplace' && p.seller) {
      const { commissionAmount, sellerReceivableAmount } = computeLineCommission(lineTotal, commissionPercentage);
      Object.assign(line, {
        isMarketplace: true,
        seller: p.seller,
        sellerProduct: p.sellerProduct,
        productPrice: lineTotal,
        commissionPercentage,
        commissionAmount,
        sellerReceivableAmount,
        settlementStatus: 'pending',
      });
    }
    orderItems.push(line);
  }

  // Optional coupon.
  let discount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    appliedCoupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!appliedCoupon) throw new ApiError(404, 'Invalid coupon code');
    discount = couponDiscount(appliedCoupon, subtotal);
  }

  const { tax, shippingCost, total } = computeTotals({ subtotal, discount, settings });

  if (paymentMethod === 'razorpay' && !isRazorpayConfigured) {
    throw new ApiError(400, 'Razorpay is not configured');
  }

  const baseOrder = {
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    subtotal,
    shippingCost,
    tax,
    discount,
    total,
    couponCode: appliedCoupon?.code || '',
    paymentMethod,
    paymentStatus: 'pending',
    orderStatus: 'pending',
  };

  // Razorpay: create the order + gateway order now, but DEFER stock/coupon/cart
  // changes until payment is verified (see payment.controller). Nothing is committed
  // if the customer abandons the payment.
  if (paymentMethod === 'razorpay') {
    const order = await Order.create(baseOrder);
    await Transaction.create({ order: order._id, user: req.user._id, amount: total, method: paymentMethod, status: 'pending' });

    const razorpayOrder = await createRazorpayOrder(total, order.orderNumber);
    order.razorpay.orderId = razorpayOrder.id;
    await order.save();

    return sendSuccess(res, {
      status: 201,
      message: 'Order created, awaiting payment',
      data: {
        order,
        razorpay: { orderId: razorpayOrder.id, amount: razorpayOrder.amount, keyId: env.razorpay.keyId },
      },
    });
  }

  // Offline methods (COD/bank/check): reserve stock FIRST so we never create an
  // order we can't fulfil (reserveStock throws + rolls back if anything is out of stock).
  await reserveStock(orderItems);
  const order = await Order.create(baseOrder);
  await Transaction.create({ order: order._id, user: req.user._id, amount: total, method: paymentMethod, status: 'pending' });
  if (appliedCoupon) await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usedCount: 1 } });
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  return sendSuccess(res, {
    status: 201,
    message: 'Order placed',
    data: { order, razorpay: null },
  });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  sendSuccess(res, { data: orders });
});

export const getMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!order) throw new ApiError(404, 'Order not found');
  sendSuccess(res, { data: order });
});

// ----- Admin -----
export const adminListOrders = asyncHandler(async (req, res) => {
  const { q, status, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (q) filter.orderNumber = containsFilter(q);
  if (status) filter.orderStatus = status;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Math.max(1, Number(limit) || 10));

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate('user', 'name email avatar')
      .lean(),
    Order.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: orders,
    meta: { page: pageNum, limit: perPage, total, pages: Math.ceil(total / perPage) },
  });
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email avatar phone').lean();
  if (!order) throw new ApiError(404, 'Order not found');
  sendSuccess(res, { data: order });
});

export const adminUpdateOrder = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  const wasPaid = order.paymentStatus === 'paid';

  if (orderStatus) {
    order.orderStatus = orderStatus;
    // Stamp delivery time once — it starts the settlement return window.
    if (orderStatus === 'delivered' && !order.deliveredAt) order.deliveredAt = new Date();
  }
  if (paymentStatus) order.paymentStatus = paymentStatus;
  await order.save();

  // Marketplace settlement hooks (no-ops for store-only orders).
  // Becomes paid (e.g. COD on delivery) -> credit sellers' pending wallet (idempotent).
  if (paymentStatus === 'paid' && !wasPaid) {
    await creditSellerPending(order);
  }
  // Refunded / cancelled -> claw back any seller credit.
  if (orderStatus === 'cancelled' || paymentStatus === 'refunded') {
    await reverseOrderCredits(order, { note: `Order ${orderStatus || paymentStatus}` });
  }

  sendSuccess(res, { message: 'Order updated', data: order });
});
