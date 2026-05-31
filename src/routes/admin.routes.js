import { Router } from 'express';
import * as admin from '../controllers/admin.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';

const router = Router();

router.use(protect, adminOnly);

router.get('/dashboard', admin.getDashboard);
router.get('/counts', admin.getNotificationCounts);
router.get('/customers', admin.listCustomers);
router.get('/transactions', admin.listTransactions);

export default router;
