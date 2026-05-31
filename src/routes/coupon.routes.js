import { Router } from 'express';
import * as coupon from '../controllers/coupon.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { applyCouponSchema, couponSchema } from '../validations/commerce.validation.js';

const router = Router();

// Public: apply/validate a coupon at checkout
router.post('/apply', protect, validate(applyCouponSchema), coupon.applyCoupon);

// Admin CRUD
router.get('/', protect, adminOnly, coupon.listCoupons);
router.post('/', protect, adminOnly, validate(couponSchema), coupon.createCoupon);
router.patch('/:id', protect, adminOnly, validate(couponSchema.partial()), coupon.updateCoupon);
router.delete('/:id', protect, adminOnly, coupon.deleteCoupon);

export default router;
