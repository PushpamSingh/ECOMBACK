import { Router } from 'express';
import * as cart from '../controllers/cart.controller.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { cartItemSchema, updateCartItemSchema } from '../validations/commerce.validation.js';

const router = Router();

router.use(protect); // cart is always user-bound

router.get('/', cart.getCart);
router.post('/', validate(cartItemSchema), cart.addToCart);
router.patch('/:productId', validate(updateCartItemSchema), cart.updateCartItem);
router.delete('/:productId', cart.removeCartItem);
router.delete('/', cart.clearCart);

export default router;
