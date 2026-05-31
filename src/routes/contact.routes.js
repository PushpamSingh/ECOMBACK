import { Router } from 'express';
import * as contact from '../controllers/contact.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { contactSchema } from '../validations/commerce.validation.js';

const router = Router();

router.post('/', validate(contactSchema), contact.createMessage);

// Admin
router.get('/', protect, adminOnly, contact.listMessages);
router.patch('/:id/read', protect, adminOnly, contact.markMessageRead);

export default router;
