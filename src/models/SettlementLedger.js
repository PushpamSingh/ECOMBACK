import mongoose from 'mongoose';

// Append-only money journal. The single source of truth for seller balances;
// SellerWallet is the cached aggregate of these entries.
export const LEDGER_TYPES = [
  'CREDIT_PENDING', // seller receivable recorded when a marketplace order is paid
  'MATURE_AVAILABLE', // pending -> available after settlement window
  'PAYOUT_PROCESSING', // available -> processing when a payout starts
  'PAYOUT_PAID', // processing -> paid when a payout succeeds
  'PAYOUT_REVERSAL', // processing -> available when a payout fails/cancels
  'REFUND_DEBIT', // claw back a seller credit due to refund
  'ADJUSTMENT', // manual admin correction
];

const settlementLedgerSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
    type: { type: String, enum: LEDGER_TYPES, required: true },
    amount: { type: Number, required: true }, // always positive; type defines direction
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    payout: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout' },
    note: { type: String, default: '' },
    // Idempotency: prevents the same event (e.g. a webhook replay) creating duplicate entries.
    refKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model('SettlementLedger', settlementLedgerSchema);
