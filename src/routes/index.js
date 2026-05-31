import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import cartRoutes from './cart.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import orderRoutes from './order.routes.js';
import couponRoutes from './coupon.routes.js';
import reviewRoutes from './review.routes.js';
import paymentRoutes from './payment.routes.js';
import contactRoutes from './contact.routes.js';
import settingsRoutes from './settings.routes.js';
import adminRoutes from './admin.routes.js';
import uploadRoutes from './upload.routes.js';
import sellerRoutes from './seller.routes.js';
import marketplaceAdminRoutes from './marketplaceAdmin.routes.js';
import notificationRoutes from './notification.routes.js';
import disputeRoutes from './dispute.routes.js';
import bannerRoutes from './banner.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/orders', orderRoutes);
router.use('/coupons', couponRoutes);
router.use('/reviews', reviewRoutes);
router.use('/payments', paymentRoutes);
router.use('/contact', contactRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/marketplace', marketplaceAdminRoutes);
router.use('/upload', uploadRoutes);
router.use('/seller', sellerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/disputes', disputeRoutes);
router.use('/banners', bannerRoutes);

export default router;
