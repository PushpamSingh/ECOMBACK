import { Router } from 'express';
import * as payment from '../controllers/payment.controller.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { verifyPaymentSchema } from '../validations/commerce.validation.js';

const router = Router();

router.post('/razorpay/verify', protect, validate(verifyPaymentSchema), payment.verifyPayment);

export default router;
