import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Seller from '../models/Seller.js';
import SellerVerification from '../models/SellerVerification.js';
import SellerBankDetails from '../models/SellerBankDetails.js';
import SellerProduct from '../models/SellerProduct.js';
import SellerWallet from '../models/SellerWallet.js';
import Payout from '../models/Payout.js';
import Dispute from '../models/Dispute.js';
import Order from '../models/Order.js';
import CommissionSettings from '../models/CommissionSettings.js';
import AdminApprovalHistory from '../models/AdminApprovalHistory.js';
import AuditLog from '../models/AuditLog.js';
import { containsFilter } from '../utils/sanitize.js';
import { publishSellerProduct, unpublishSellerProduct } from '../services/sellerProductPublish.service.js';
import { runSettlement } from '../services/settlement.service.js';
import { createPayout, markPayoutPaid, markPayoutFailed } from '../services/payout.service.js';
import { resolveDispute } from '../services/dispute.service.js';
import { notify } from '../services/notification.service.js';

const audit = (actor, action, entity, entityId, meta) =>
  AuditLog.create({ actor, action, entity, entityId, meta });

// ----- Sellers -----
export const listSellers = asyncHandler(async (req, res) => {
  const { q, status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.$or = [{ storeName: containsFilter(q) }, { fullName: containsFilter(q) }, { email: containsFilter(q) }];
  const sellers = await Seller.find(filter).sort({ createdAt: -1 }).lean();
  sendSuccess(res, { data: sellers });
});

export const getSeller = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id).lean();
  if (!seller) throw new ApiError(404, 'Seller not found');
  const [verification, bank, wallet, products, payouts] = await Promise.all([
    SellerVerification.findOne({ seller: seller._id }).lean(),
    SellerBankDetails.findOne({ seller: seller._id }).lean(),
    SellerWallet.findOne({ seller: seller._id }).lean(),
    SellerProduct.find({ seller: seller._id }).sort({ createdAt: -1 }).lean(),
    Payout.find({ seller: seller._id }).sort({ createdAt: -1 }).lean(),
  ]);
  sendSuccess(res, { data: { seller, verification, bank, wallet, products, payouts } });
});

export const setSellerStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const seller = await Seller.findById(req.params.id);
  if (!seller) throw new ApiError(404, 'Seller not found');
  seller.status = status;
  await seller.save();
  if (status === 'active') {
    await SellerVerification.findOneAndUpdate(
      { seller: seller._id },
      { status: 'verified', verifiedAt: new Date(), verifiedBy: req.user._id }
    );
  }
  await audit(req.user._id, `seller_status_${status}`, 'Seller', seller._id);
  sendSuccess(res, { message: `Seller marked ${status}`, data: seller });
});

// ----- Product review -----
export const listReviewQueue = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : { status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES'] } };
  const products = await SellerProduct.find(filter)
    .sort({ updatedAt: -1 })
    .populate('seller', 'storeName')
    .populate('category', 'name')
    .lean();
  sendSuccess(res, { data: products });
});

export const getSellerProduct = asyncHandler(async (req, res) => {
  const product = await SellerProduct.findById(req.params.id)
    .populate('seller', 'storeName fullName')
    .populate('category', 'name')
    .lean();
  if (!product) throw new ApiError(404, 'Product not found');
  const history = await AdminApprovalHistory.find({ sellerProduct: product._id }).sort({ createdAt: -1 }).lean();
  sendSuccess(res, { data: { product, history } });
});

// approve | reject | request_changes | block | unpublish — all require admin notes.
export const reviewProduct = asyncHandler(async (req, res) => {
  const { action, notes } = req.body;
  const current = await SellerProduct.findById(req.params.id);
  if (!current) throw new ApiError(404, 'Product not found');

  const transitions = {
    approve: { from: ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES'], to: 'PUBLISHED', notify: 'product_approved' },
    reject: { from: ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES'], to: 'REJECTED', notify: 'product_rejected' },
    request_changes: { from: ['SUBMITTED', 'UNDER_REVIEW'], to: 'NEEDS_CHANGES', notify: 'product_needs_changes' },
    block: { from: ['PUBLISHED', 'UNPUBLISHED', 'APPROVED', 'SUBMITTED', 'UNDER_REVIEW'], to: 'BLOCKED' },
    unpublish: { from: ['PUBLISHED'], to: 'UNPUBLISHED' },
  };
  const t = transitions[action];
  if (!t) throw new ApiError(400, 'Invalid action');

  // Status-guarded transition prevents concurrent admins double-processing.
  const product = await SellerProduct.findOneAndUpdate(
    { _id: current._id, status: { $in: t.from } },
    { status: t.to, adminNotes: notes },
    { new: true }
  );
  if (!product) throw new ApiError(409, `Cannot ${action} a product in status ${current.status}`);

  if (action === 'approve') {
    product.product = await publishSellerProduct(product);
    await product.save();
  } else if (action === 'block' || action === 'unpublish') {
    await unpublishSellerProduct(product);
  }

  await AdminApprovalHistory.create({
    sellerProduct: product._id,
    admin: req.user._id,
    action,
    fromStatus: current.status,
    toStatus: product.status,
    notes,
  });
  if (t.notify) await notify(product, product.seller, t.notify);
  await audit(req.user._id, `product_${action}`, 'SellerProduct', product._id);

  sendSuccess(res, { message: `Product ${action.replace('_', ' ')} done`, data: product });
});

// ----- Commission settings -----
export const getCommissionSettings = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await CommissionSettings.getSettings() });
});

export const updateCommissionSettings = asyncHandler(async (req, res) => {
  const settings = await CommissionSettings.getSettings();
  settings.history.push({
    commissionValue: settings.commissionValue,
    returnWindowDays: settings.returnWindowDays,
    changedBy: req.user._id,
    changedAt: new Date(),
  });
  ['commissionValue', 'returnWindowDays', 'payoutMinAmount', 'requireAadhaar', 'requirePan'].forEach((k) => {
    if (req.body[k] !== undefined) settings[k] = req.body[k];
  });
  await settings.save();
  await audit(req.user._id, 'commission_updated', 'CommissionSettings', settings._id, req.body);
  sendSuccess(res, { message: 'Marketplace settings updated', data: settings });
});

// ----- Settlement -----
export const runSettlementJob = asyncHandler(async (req, res) => {
  const result = await runSettlement();
  await audit(req.user._id, 'settlement_run', 'Settlement', undefined, result);
  sendSuccess(res, { message: `Settled ${result.matured} line(s)`, data: result });
});

// ----- Payouts -----
export const listEligiblePayouts = asyncHandler(async (req, res) => {
  const settings = await CommissionSettings.getSettings();
  const min = settings.payoutMinAmount || 1;
  const wallets = await SellerWallet.find({ availableAmount: { $gte: min } })
    .populate({ path: 'seller', select: 'storeName fullName status' })
    .lean();
  sendSuccess(res, { data: wallets.filter((w) => w.seller && w.seller.status === 'active') });
});

export const listPayouts = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const payouts = await Payout.find(filter).sort({ createdAt: -1 }).populate('seller', 'storeName fullName').lean();
  sendSuccess(res, { data: payouts });
});

export const approvePayout = asyncHandler(async (req, res) => {
  const { sellerId, amount } = req.body;
  const payout = await createPayout({ sellerId, amount, actor: req.user._id });
  await audit(req.user._id, 'payout_created', 'Payout', payout._id, { amount });
  sendSuccess(res, { status: 201, message: 'Payout started', data: payout });
});

export const payoutMarkPaid = asyncHandler(async (req, res) => {
  const payout = await markPayoutPaid({ payoutId: req.params.id, actor: req.user._id, gatewayPayoutId: req.body.gatewayPayoutId });
  await audit(req.user._id, 'payout_paid', 'Payout', payout._id);
  sendSuccess(res, { message: 'Payout marked paid', data: payout });
});

export const payoutMarkFailed = asyncHandler(async (req, res) => {
  const payout = await markPayoutFailed({ payoutId: req.params.id, actor: req.user._id, reason: req.body.reason || 'Failed' });
  await audit(req.user._id, 'payout_failed', 'Payout', payout._id);
  sendSuccess(res, { message: 'Payout marked failed', data: payout });
});

// ----- Disputes -----
export const listDisputes = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const disputes = await Dispute.find(filter)
    .sort({ createdAt: -1 })
    .populate('seller', 'storeName')
    .populate('buyer', 'name email')
    .populate('order', 'orderNumber total')
    .lean();
  sendSuccess(res, { data: disputes });
});

export const resolveDisputeCtrl = asyncHandler(async (req, res) => {
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) throw new ApiError(404, 'Dispute not found');
  const updated = await resolveDispute({
    dispute,
    resolution: req.body.resolution,
    refundAmount: req.body.refundAmount || 0,
    adminNotes: req.body.adminNotes,
    admin: req.user._id,
  });
  await audit(req.user._id, 'dispute_resolved', 'Dispute', updated._id, { resolution: req.body.resolution });
  sendSuccess(res, { message: 'Dispute resolved', data: updated });
});

// ----- Analytics -----
export const marketplaceAnalytics = asyncHandler(async (req, res) => {
  const [commissionAgg, sellerAgg, walletAgg, payoutAgg, pendingLines] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      { $match: { 'items.isMarketplace': true } },
      {
        $group: {
          _id: null,
          commission: { $sum: '$items.commissionAmount' },
          sellerRevenue: { $sum: '$items.sellerReceivableAmount' },
          gmv: { $sum: '$items.productPrice' },
        },
      },
    ]),
    Seller.countDocuments({ status: 'active' }),
    SellerWallet.aggregate([
      {
        $group: {
          _id: null,
          pending: { $sum: '$pendingAmount' },
          available: { $sum: '$availableAmount' },
          processing: { $sum: '$processingAmount' },
          paid: { $sum: '$paidAmount' },
        },
      },
    ]),
    Payout.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
    Order.countDocuments({ 'items.settlementStatus': 'pending' }),
  ]);

  const c = commissionAgg[0] || { commission: 0, sellerRevenue: 0, gmv: 0 };
  const w = walletAgg[0] || { pending: 0, available: 0, processing: 0, paid: 0 };
  const payoutsByStatus = Object.fromEntries(payoutAgg.map((p) => [p._id, { count: p.count, amount: p.amount }]));

  sendSuccess(res, {
    data: {
      gmv: c.gmv,
      totalCommission: c.commission,
      totalSellerRevenue: c.sellerRevenue,
      activeSellers: sellerAgg,
      wallet: w,
      ordersWithPendingSettlement: pendingLines,
      payoutsByStatus,
    },
  });
});
