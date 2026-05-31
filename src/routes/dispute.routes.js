import { Router } from 'express';
import * as dispute from '../controllers/dispute.controller.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { disputeRaiseSchema } from '../validations/marketplace.validation.js';

const router = Router();

router.use(protect);
router.post('/', validate(disputeRaiseSchema), dispute.createDispute);
router.get('/mine', dispute.listMyDisputes);

export default router;
