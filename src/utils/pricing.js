// Pure helpers for computing cart/order money figures. Kept simple and DB-driven:
// product prices come from the DB, fees/tax come from SiteSettings, discount from a Coupon.

import ApiError from './ApiError.js';

// Discount value for one product line, using its own discount config.
export function lineUnitPrice(product) {
  if (product.discountType === 'percent') {
    return Math.max(0, Math.round(product.price - (product.price * product.discountValue) / 100));
  }
  if (product.discountType === 'fixed') {
    return Math.max(0, product.price - product.discountValue);
  }
  return product.price;
}

// Validates a coupon against a subtotal and returns the discount amount.
export function couponDiscount(coupon, subtotal) {
  const now = new Date();
  if (!coupon.isActive) throw new ApiError(400, 'Coupon is not active');
  if (now < coupon.startDate) throw new ApiError(400, 'Coupon is not active yet');
  if (now > coupon.endDate) throw new ApiError(400, 'Coupon has expired');
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'Coupon usage limit reached');
  }
  if (subtotal < coupon.minOrderValue) {
    throw new ApiError(400, `Minimum order value is ${coupon.minOrderValue}`);
  }

  let discount =
    coupon.discountType === 'percent'
      ? Math.round((subtotal * coupon.discountValue) / 100)
      : coupon.discountValue;

  if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  return Math.min(discount, subtotal);
}

// Computes shipping, tax and total from a subtotal using site settings.
export function computeTotals({ subtotal, discount = 0, settings }) {
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round((taxable * (settings.taxRate || 0)) / 100);

  let shippingCost = settings.shippingFee || 0;
  if (settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold) {
    shippingCost = 0;
  }

  const total = taxable + tax + shippingCost;
  return { tax, shippingCost, total };
}
