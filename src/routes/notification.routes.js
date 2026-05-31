import { Router } from 'express';
import * as notification from '../controllers/notification.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.get('/', notification.listNotifications);
router.patch('/read-all', notification.markAllRead);
router.patch('/:id/read', notification.markNotificationRead);

export default router;
