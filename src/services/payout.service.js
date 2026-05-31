import Payout from '../models/Payout.js';
import PayoutTransaction from '../models/PayoutTransaction.js';
import SellerWallet from '../models/SellerWallet.js';
import SellerBankDetails from '../models/SellerBankDetails.js';
import CommissionSettings from '../models/CommissionSettings.js';
import ApiError from '../utils/ApiError.js';
import { recordLedgerOnly } from './wallet.service.js';
import { notify } from './notification.service.js';

/*
 * Payout state machine (admin-driven):
 *   (available funds) --createPayout--> PROCESSING --markPaid--> PAID
 *                                                  --markFailed--> FAILED (funds returned to available)
 * Idempotency:
 *  - The Payout doc (unique idempotencyKey) gates creation; the available-balance decrement
 *    is a single atomic guarded update so funds can't be double-withdrawn.
 *  - markPaid/markFailed use status-guarded findOneAndUpdate, so concurrent/duplicate calls
 *    only transition once.
 */

async function logTxn(payout, fromStatus, toStatus, actor, note = '') {
  await PayoutTransaction.create({
    payout: payout._id,
    seller: payout.seller,
    fromStatus,
    toStatus,
    amount: payout.amount,
    actor,
    note,
  });
}

// Starts a payout for a seller from their available balance.
export async function createPayout({ sellerId, amount, actor }) {
  const settings = await CommissionSettings.getSettings();
  if (!amount || amount <= 0) throw new ApiError(400, 'Invalid payout amount');
  if (amount < settings.payoutMinAmount) {
    throw new ApiError(400, `Minimum payout is ${settings.payoutMinAmount}`);
  }

  const bank = await SellerBankDetails.findOne({ seller: sellerId });
  if (!bank) throw new ApiError(400, 'Seller has no payout/bank details');

  const bankSnapshot = {
    method: bank.method,
    upiId: bank.upiId,
    accountHolder: bank.accountHolder,
    accountNumber: bank.accountNumber,
    ifsc: bank.ifsc,
    bankName: bank.bankName,
  };

  // The Payout doc is the idempotency anchor.
  const payout = await Payout.create({
    seller: sellerId,
    amount,
    status: 'PROCESSING',
    idempotencyKey: `payout:${sellerId}:${Date.now()}`,
    bankSnapshot,
    processedBy: actor,
  });

  // Atomically reserve funds — fails (null) if available balance is insufficient.
  const wallet = await SellerWallet.findOneAndUpdate(
    { seller: sellerId, availableAmount: { $gte: amount } },
    { $inc: { availableAmount: -amount, processingAmount: amount } },
    { new: true }
  );
  if (!wallet) {
    payout.status = 'CANCELLED';
    payout.failureReason = 'Insufficient available balance';
    await payout.save();
    throw new ApiError(400, 'Insufficient available balance');
  }

  await recordLedgerOnly({
    seller: sellerId,
    type: 'PAYOUT_PROCESSING',
    amount,
    payout: payout._id,
    note: 'Payout started',
    refKey: `payout-proc:${payout._id}`,
  });
  await logTxn(payout, 'PENDING', 'PROCESSING', actor);
  return payout;
}

export async function markPayoutPaid({ payoutId, actor, gatewayPayoutId = '' }) {
  const payout = await Payout.findOneAndUpdate(
    { _id: payoutId, status: 'PROCESSING' },
    { status: 'PAID', paidAt: new Date(), processedBy: actor, gatewayPayoutId },
    { new: true }
  );
  if (!payout) throw new ApiError(409, 'Payout is not in a payable state');

  await SellerWallet.updateOne(
    { seller: payout.seller },
    { $inc: { processingAmount: -payout.amount, paidAmount: payout.amount } }
  );
  await recordLedgerOnly({
    seller: payout.seller,
    type: 'PAYOUT_PAID',
    amount: payout.amount,
    payout: payout._id,
    note: 'Payout paid',
    refKey: `payout-paid:${payout._id}`,
  });
  await logTxn(payout, 'PROCESSING', 'PAID', actor);
  await notify(payout, payout.seller, 'settlement_paid');
  return payout;
}

export async function markPayoutFailed({ payoutId, actor, reason = '' }) {
  const payout = await Payout.findOneAndUpdate(
    { _id: payoutId, status: 'PROCESSING' },
    { status: 'FAILED', failureReason: reason, processedBy: actor },
    { new: true }
  );
  if (!payout) throw new ApiError(409, 'Payout is not in a failable state');

  // Return reserved funds to available.
  await SellerWallet.updateOne(
    { seller: payout.seller },
    { $inc: { processingAmount: -payout.amount, availableAmount: payout.amount } }
  );
  await recordLedgerOnly({
    seller: payout.seller,
    type: 'PAYOUT_REVERSAL',
    amount: payout.amount,
    payout: payout._id,
    note: `Payout failed: ${reason}`,
    refKey: `payout-rev:${payout._id}`,
  });
  await logTxn(payout, 'PROCESSING', 'FAILED', actor, reason);
  await notify(payout, payout.seller, 'settlement_failed');
  return payout;
}
