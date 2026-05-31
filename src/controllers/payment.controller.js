import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import Transaction from '../models/Transaction.js';
import { verifyRazorpaySignature } from '../services/razorpay.service.js';
import { creditSellerPending } from '../services/settlement.service.js';
import Product from '../models/Product.js';

// Verifies a Razorpay payment, then commits the order (stock, coupon, cart).
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const valid = verifyRazorpaySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) throw new ApiError(400, 'Payment verification failed');

  // Atomic state transition: only the first verification of a pending order wins.
  const order = await Order.findOneAndUpdate(
    { 'razorpay.orderId': razorpayOrderId, user: req.user._id, paymentStatus: 'pending' },
    {
      paymentStatus: 'paid',
      orderStatus: 'processing',
      'razorpay.paymentId': razorpayPaymentId,
      'razorpay.signature': razorpaySignature,
    },
    { new: true }
  );

  if (!order) {
    // Either no such order, or it was already paid (idempotent replay).
    const existing = await Order.findOne({ 'razorpay.orderId': razorpayOrderId, user: req.user._id });
    if (existing?.paymentStatus === 'paid') {
      return sendSuccess(res, { message: 'Payment already verified', data: { order: existing } });
    }
    throw new ApiError(404, 'Order not found');
  }

  // Commit inventory for the now-paid order (honour the paid order even if stock is tight).
  for (const item of order.items) {
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } });
  }
  if (order.couponCode) {
    await Coupon.findOneAndUpdate({ code: order.couponCode }, { $inc: { usedCount: 1 } });
  }

  await Transaction.findOneAndUpdate(
    { order: order._id },
    { status: 'success', gatewayPaymentId: razorpayPaymentId, gatewayOrderId: razorpayOrderId }
  );

  // Credit any marketplace sellers' pending wallet (idempotent).
  await creditSellerPending(order);

  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  sendSuccess(res, { message: 'Payment verified', data: { order } });
});
