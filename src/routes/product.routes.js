import { Router } from 'express';
import * as product from '../controllers/product.controller.js';
import * as review from '../controllers/review.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { productSchema } from '../validations/catalog.validation.js';
import { reviewSchema } from '../validations/commerce.validation.js';

const router = Router();

// Admin (declared before slug route to avoid conflicts)
router.get('/admin', protect, adminOnly, product.listProductsAdmin);
router.get('/admin/:id', protect, adminOnly, product.getProductById);
router.post('/', protect, adminOnly, validate(productSchema), product.createProduct);
router.patch('/:id', protect, adminOnly, validate(productSchema.partial()), product.updateProduct);
router.delete('/:id', protect, adminOnly, product.deleteProduct);

// Public catalog
router.get('/', product.listProducts);
router.get('/:slug', product.getProductBySlug);

// Reviews for a product
router.get('/:productId/reviews', review.listProductReviews);
router.post('/:productId/reviews', protect, validate(reviewSchema), review.createReview);

export default router;
