import mongoose from 'mongoose';

export const PAYOUT_STATUS = [
  'PENDING',
  'READY_FOR_SETTLEMENT',
  'PROCESSING',
  'PAID',
  'FAILED',
  'ON_HOLD',
  'DISPUTED',
  'CANCELLED',
];

const payoutSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYOUT_STATUS, default: 'PENDING', index: true },

    // Prevents duplicate payouts (double-click / retry / concurrent admin actions).
    idempotencyKey: { type: String, unique: true },

    // Bank details are snapshotted at payout time so later edits don't affect in-flight payouts.
    bankSnapshot: {
      method: String,
      upiId: String,
      accountHolder: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
    },

    gatewayPayoutId: { type: String, default: '' },
    failureReason: { type: String, default: '' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Payout', payoutSchema);
