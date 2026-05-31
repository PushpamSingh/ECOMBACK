import { Router } from 'express';
import * as admin from '../controllers/adminMarketplace.controller.js';
import { protect, adminOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  commissionSettingsSchema,
  productReviewSchema,
  payoutCreateSchema,
  disputeResolveSchema,
  sellerStatusSchema,
} from '../validations/marketplace.validation.js';

const router = Router();
router.use(protect, adminOnly);

// Sellers
router.get('/sellers', admin.listSellers);
router.get('/sellers/:id', admin.getSeller);
router.patch('/sellers/:id/status', validate(sellerStatusSchema), admin.setSellerStatus);

// Product review
router.get('/products', admin.listReviewQueue);
router.get('/products/:id', admin.getSellerProduct);
router.post('/products/:id/review', validate(productReviewSchema), admin.reviewProduct);

// Commission / marketplace settings
router.get('/settings', admin.getCommissionSettings);
router.patch('/settings', validate(commissionSettingsSchema), admin.updateCommissionSettings);

// Settlement
router.post('/settlements/run', admin.runSettlementJob);

// Payouts
router.get('/payouts/eligible', admin.listEligiblePayouts);
router.get('/payouts', admin.listPayouts);
router.post('/payouts', validate(payoutCreateSchema), admin.approvePayout);
router.patch('/payouts/:id/paid', admin.payoutMarkPaid);
router.patch('/payouts/:id/failed', admin.payoutMarkFailed);

// Disputes
router.get('/disputes', admin.listDisputes);
router.patch('/disputes/:id/resolve', validate(disputeResolveSchema), admin.resolveDisputeCtrl);

// Analytics
router.get('/analytics', admin.marketplaceAnalytics);

export default router;
