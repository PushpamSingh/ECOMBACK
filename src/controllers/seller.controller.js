import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Seller from '../models/Seller.js';
import SellerVerification from '../models/SellerVerification.js';
import SellerBankDetails from '../models/SellerBankDetails.js';
import SellerWallet from '../models/SellerWallet.js';
import SettlementLedger from '../models/SettlementLedger.js';
import Payout from '../models/Payout.js';
import Order from '../models/Order.js';
import { getWallet as ensureWallet } from '../services/wallet.service.js';

// Customer becomes a seller (status starts 'pending' until an admin verifies).
export const becomeSeller = asyncHandler(async (req, res) => {
  const existing = await Seller.findOne({ user: req.user._id });
  if (existing) throw new ApiError(409, 'You are already registered as a seller');

  const { aadhaarNumber = '', panNumber = '', ...profile } = req.body;
  const seller = await Seller.create({ ...profile, user: req.user._id, status: 'pending' });
  await SellerVerification.create({ seller: seller._id, aadhaarNumber, panNumber });
  await ensureWallet(seller._id);

  sendSuccess(res, { status: 201, message: 'Seller profile submitted for verification', data: seller });
});

// Full seller context for the dashboard.
export const getMySeller = asyncHandler(async (req, res) => {
  const seller = req.seller;
  const [verification, bank, wallet] = await Promise.all([
    SellerVerification.findOne({ seller: seller._id }).lean(),
    SellerBankDetails.findOne({ seller: seller._id }).lean(),
    ensureWallet(seller._id),
  ]);
  sendSuccess(res, { data: { seller, verification, bank, wallet } });
});

export const updateSellerProfile = asyncHandler(async (req, res) => {
  const editable = ['fullName', 'mobile', 'email', 'address', 'city', 'state', 'country', 'pincode', 'storeName', 'storeDescription'];
  editable.forEach((k) => {
    if (req.body[k] !== undefined) req.seller[k] = req.body[k];
  });
  await req.seller.save();
  sendSuccess(res, { message: 'Profile updated', data: req.seller });
});

export const setBankDetails = asyncHandler(async (req, res) => {
  const bank = await SellerBankDetails.findOneAndUpdate(
    { seller: req.seller._id },
    { ...req.body, seller: req.seller._id },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  sendSuccess(res, { message: 'Payout details saved', data: bank });
});

export const getWallet = asyncHandler(async (req, res) => {
  const wallet = await ensureWallet(req.seller._id);
  sendSuccess(res, { data: wallet });
});

export const getLedger = asyncHandler(async (req, res) => {
  const entries = await SettlementLedger.find({ seller: req.seller._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  sendSuccess(res, { data: entries });
});

export const getMyPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find({ seller: req.seller._id }).sort({ createdAt: -1 }).lean();
  sendSuccess(res, { data: payouts });
});

// Orders containing this seller's lines, projected to just those lines.
export const getMySettlements = asyncHandler(async (req, res) => {
  const orders = await Order.find({ 'items.seller': req.seller._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const rows = [];
  for (const o of orders) {
    for (const item of o.items) {
      if (String(item.seller) === String(req.seller._id)) {
        rows.push({
          orderNumber: o.orderNumber,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          createdAt: o.createdAt,
          deliveredAt: o.deliveredAt,
          name: item.name,
          quantity: item.quantity,
          productPrice: item.productPrice,
          commissionAmount: item.commissionAmount,
          sellerReceivableAmount: item.sellerReceivableAmount,
          settlementStatus: item.settlementStatus,
        });
      }
    }
  }
  sendSuccess(res, { data: rows });
});
