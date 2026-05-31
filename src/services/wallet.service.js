import SellerWallet from '../models/SellerWallet.js';
import SettlementLedger from '../models/SettlementLedger.js';

/*
 * The wallet is the cached aggregate of the append-only SettlementLedger.
 * Every money movement goes through `postLedger`, which (1) writes ONE ledger
 * entry and (2) applies the matching atomic balance deltas to SellerWallet.
 * Controllers must never touch wallet balances directly.
 *
 * Buckets: pending -> available -> processing -> paid, with refundDeducted tracking claw-backs.
 *
 * Each ledger TYPE maps to a fixed set of bucket deltas:
 *   CREDIT_PENDING     +pending
 *   MATURE_AVAILABLE   -pending  +available
 *   PAYOUT_PROCESSING  -available +processing
 *   PAYOUT_PAID        -processing +paid
 *   PAYOUT_REVERSAL    -processing +available
 *   REFUND_DEBIT       -<bucket>  +refundDeducted   (bucket chosen by caller via opts.from)
 *   ADJUSTMENT         +/- available (signed via opts.delta)
 */

const DELTAS = {
  CREDIT_PENDING: (a) => ({ pendingAmount: a }),
  MATURE_AVAILABLE: (a) => ({ pendingAmount: -a, availableAmount: a }),
  PAYOUT_PROCESSING: (a) => ({ availableAmount: -a, processingAmount: a }),
  PAYOUT_PAID: (a) => ({ processingAmount: -a, paidAmount: a }),
  PAYOUT_REVERSAL: (a) => ({ processingAmount: -a, availableAmount: a }),
};

async function ensureWallet(sellerId) {
  return SellerWallet.findOneAndUpdate(
    { seller: sellerId },
    { $setOnInsert: { seller: sellerId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

/**
 * Posts a ledger entry and applies wallet deltas atomically.
 * @param {string} refKey  Idempotency key — if an entry with this key exists, this is a no-op.
 * Returns true if posted, false if it was a duplicate (already processed).
 */
export async function postLedger({ seller, type, amount, order, payout, note = '', refKey, from }) {
  if (amount < 0) throw new Error('Ledger amount must be non-negative');
  await ensureWallet(seller);

  // Idempotency: rely on the unique sparse index on refKey.
  try {
    await SettlementLedger.create({ seller, type, amount, order, payout, note, refKey });
  } catch (err) {
    if (err.code === 11000) return false; // duplicate refKey -> already applied
    throw err;
  }

  let inc;
  if (type === 'REFUND_DEBIT') {
    const bucket = from || 'pendingAmount';
    inc = { [bucket]: -amount, refundDeductedAmount: amount };
  } else if (type === 'ADJUSTMENT') {
    inc = { availableAmount: amount }; // caller passes a positive amount; use REFUND_DEBIT for claw-backs
  } else {
    inc = DELTAS[type](amount);
  }

  await SellerWallet.updateOne({ seller }, { $inc: inc });
  return true;
}

// Inserts a ledger row ONLY (no wallet delta). Used by payout flows where the wallet
// is updated via a status-guarded atomic operation. Idempotent via refKey.
// Returns true if inserted, false if it was a duplicate.
export async function recordLedgerOnly({ seller, type, amount, order, payout, note = '', refKey }) {
  try {
    await SettlementLedger.create({ seller, type, amount, order, payout, note, refKey });
    return true;
  } catch (err) {
    if (err.code === 11000) return false;
    throw err;
  }
}

export async function getWallet(sellerId) {
  return ensureWallet(sellerId);
}
