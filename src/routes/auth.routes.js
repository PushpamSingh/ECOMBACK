import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  addressSchema,
} from '../validations/auth.validation.js';

const router = Router();

router.post('/register', validate(registerSchema), auth.register);
router.post('/login', validate(loginSchema), auth.login);
router.post('/logout', auth.logout);

router.get('/me', protect, auth.getMe);
router.patch('/profile', protect, validate(updateProfileSchema), auth.updateProfile);
router.patch('/password', protect, validate(changePasswordSchema), auth.changePassword);

router.get('/addresses', protect, auth.getAddresses);
router.post('/addresses', protect, validate(addressSchema), auth.addAddress);
router.patch('/addresses/:id', protect, validate(addressSchema.partial()), auth.updateAddress);
router.delete('/addresses/:id', protect, auth.deleteAddress);

export default router;
