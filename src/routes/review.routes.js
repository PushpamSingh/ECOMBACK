import { Router } from 'express';
import * as review from '../controllers/review.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { reviewStatusSchema } from '../validations/commerce.validation.js';

const router = Router();

// Admin moderation
router.get('/', protect, adminOnly, review.adminListReviews);
router.patch('/:id', protect, adminOnly, validate(reviewStatusSchema), review.adminUpdateReview);
router.delete('/:id', protect, adminOnly, review.adminDeleteReview);

export default router;
