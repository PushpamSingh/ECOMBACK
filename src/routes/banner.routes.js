import { Router } from 'express';
import * as banner from '../controllers/banner.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { bannerSchema, bannerStatusSchema, bannerReorderSchema } from '../validations/banner.validation.js';

const router = Router();

// Public: live banners for the storefront
router.get('/', banner.listLiveBanners);

// Admin (static paths before '/:id' to avoid conflicts)
router.get('/admin', protect, adminOnly, banner.listBannersAdmin);
router.patch('/reorder', protect, adminOnly, validate(bannerReorderSchema), banner.reorderBanners);
router.post('/', protect, adminOnly, validate(bannerSchema), banner.createBanner);
router.get('/:id', protect, adminOnly, banner.getBanner);
router.put('/:id', protect, adminOnly, validate(bannerSchema), banner.updateBanner);
router.delete('/:id', protect, adminOnly, banner.deleteBanner);
router.patch('/:id/status', protect, adminOnly, validate(bannerStatusSchema), banner.setBannerStatus);

export default router;
