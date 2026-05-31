import { Router } from 'express';
import * as wishlist from '../controllers/wishlist.controller.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { wishlistToggleSchema } from '../validations/commerce.validation.js';

const router = Router();

router.use(protect);

router.get('/', wishlist.getWishlist);
router.post('/toggle', validate(wishlistToggleSchema), wishlist.toggleWishlist);
router.delete('/:productId', wishlist.removeFromWishlist);

export default router;
