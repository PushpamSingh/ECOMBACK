import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';
import { couponDiscount, lineUnitPrice } from '../utils/pricing.js';
import { containsFilter } from '../utils/sanitize.js';

// Public: validate a coupon against the user's CURRENT cart subtotal (server-derived,
// never trusting a client-supplied amount).
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new ApiError(404, 'Invalid coupon code');

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  const items = (cart?.items || []).filter((i) => i.product);
  const subtotal = items.reduce((sum, i) => sum + lineUnitPrice(i.product) * i.quantity, 0);
  if (subtotal === 0) throw new ApiError(400, 'Your cart is empty');

  const discount = couponDiscount(coupon, subtotal);
  sendSuccess(res, {
    message: 'Coupon applied',
    data: { code: coupon.code, discount, discountType: coupon.discountType, discountValue: coupon.discountValue },
  });
});

// Admin CRUD
export const listCoupons = asyncHandler(async (req, res) => {
  const { q, status } = req.query;
  const filter = {};
  if (q) filter.$or = [{ name: containsFilter(q) }, { code: containsFilter(q) }];
  let coupons = await Coupon.find(filter).sort({ createdAt: -1 });
  if (status) coupons = coupons.filter((c) => c.status === status);
  sendSuccess(res, { data: coupons.map((c) => c.toJSON()) });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create({ ...req.body, code: req.body.code.toUpperCase() });
  sendSuccess(res, { status: 201, message: 'Coupon created', data: coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  coupon.set({ ...req.body, code: req.body.code ? req.body.code.toUpperCase() : coupon.code });
  await coupon.save();
  sendSuccess(res, { message: 'Coupon updated', data: coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  sendSuccess(res, { message: 'Coupon deleted' });
});
