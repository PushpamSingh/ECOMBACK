import { Router } from 'express';
import * as seller from '../controllers/seller.controller.js';
import * as sellerProduct from '../controllers/sellerProduct.controller.js';
import { protect } from '../middlewares/auth.js';
import { requireSeller, requireApprovedSeller } from '../middlewares/seller.js';
import { validate } from '../middlewares/validate.js';
import {
  becomeSellerSchema,
  sellerBankSchema,
  sellerProductSchema,
} from '../validations/marketplace.validation.js';

const router = Router();

router.use(protect); // everything here requires login

// Onboarding (any logged-in customer)
router.post('/become', validate(becomeSellerSchema), seller.becomeSeller);

// Profile / wallet (requires an existing seller doc)
router.get('/me', requireSeller, seller.getMySeller);
router.patch('/profile', requireSeller, validate(becomeSellerSchema.partial()), seller.updateSellerProfile);
router.put('/bank', requireSeller, validate(sellerBankSchema), seller.setBankDetails);
router.get('/wallet', requireSeller, seller.getWallet);
router.get('/ledger', requireSeller, seller.getLedger);
router.get('/payouts', requireSeller, seller.getMyPayouts);
router.get('/settlements', requireSeller, seller.getMySettlements);

// Seller products
router.get('/products', requireSeller, sellerProduct.listMyProducts);
router.get('/products/:id', requireSeller, sellerProduct.getMyProduct);
router.post('/products', requireApprovedSeller, validate(sellerProductSchema), sellerProduct.createProduct);
router.patch('/products/:id', requireApprovedSeller, validate(sellerProductSchema.partial()), sellerProduct.updateProduct);
router.post('/products/:id/submit', requireApprovedSeller, sellerProduct.submitProduct);
router.patch('/products/:id/stock', requireApprovedSeller, sellerProduct.updateStock);
router.delete('/products/:id', requireApprovedSeller, sellerProduct.deleteProduct);

export default router;
