import mongoose from 'mongoose';

// Cached balance buckets. Every change is made in lockstep with a SettlementLedger
// entry (see services/wallet.service.js). Never mutate these directly from controllers.
const sellerWalletSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, unique: true },
    pendingAmount: { type: Number, default: 0 }, // credited, awaiting settlement maturity
    availableAmount: { type: Number, default: 0 }, // matured, withdrawable
    processingAmount: { type: Number, default: 0 }, // locked in an in-flight payout
    paidAmount: { type: Number, default: 0 }, // lifetime paid out
    refundDeductedAmount: { type: Number, default: 0 }, // lifetime clawed back via refunds
  },
  { timestamps: true }
);

export default mongoose.model('SellerWallet', sellerWalletSchema);
