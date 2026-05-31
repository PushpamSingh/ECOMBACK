import { Router } from 'express';
import * as settings from '../controllers/settings.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { settingsSchema } from '../validations/settings.validation.js';

const router = Router();

router.get('/public', settings.getPublicSettings);
router.get('/', protect, adminOnly, settings.getSettings);
router.patch('/', protect, adminOnly, validate(settingsSchema), settings.updateSettings);

export default router;
