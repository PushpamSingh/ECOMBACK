import { Router } from 'express';
import * as order from '../controllers/order.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { checkoutSchema } from '../validations/commerce.validation.js';

const router = Router();

router.use(protect);

// Admin
router.get('/admin', adminOnly, order.adminListOrders);
router.get('/admin/:id', adminOnly, order.adminGetOrder);
router.patch('/admin/:id', adminOnly, order.adminUpdateOrder);

// Customer
router.post('/', validate(checkoutSchema), order.createOrder);
router.get('/', order.getMyOrders);
router.get('/:id', order.getMyOrder);

export default router;
