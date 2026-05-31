import mongoose from 'mongoose';

// Audit trail of each state change / gateway attempt for a payout.
const payoutTransactionSchema = new mongoose.Schema(
  {
    payout: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout', required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, required: true },
    amount: { type: Number, required: true },
    gatewayRef: { type: String, default: '' },
    note: { type: String, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('PayoutTransaction', payoutTransactionSchema);
