import Order from '../models/Order.js';
import CommissionSettings from '../models/CommissionSettings.js';
import { postLedger } from './wallet.service.js';
import { notify } from './notification.service.js';

/*
 * Settlement lifecycle for marketplace order lines:
 *   order paid       -> creditSellerPending()  : wallet.pending += receivable   (CREDIT_PENDING)
 *   delivered+window -> runSettlement()         : pending -> available          (MATURE_AVAILABLE)
 *   refund/cancel    -> reverseOrderCredits()   : claw back from pending/available (REFUND_DEBIT)
 * Each step is idempotent via a per-line refKey, so webhook replays / re-runs are safe.
 */

// Credit each marketplace line's seller-receivable to the wallet's pending bucket.
// Called when an order becomes paid. Idempotent (refKey per line + order.sellerCredited).
export async function creditSellerPending(order) {
  if (order.sellerCredited) return;
  for (const item of order.items) {
    if (!item.isMarketplace || !item.seller) continue;
    if (item.settlementStatus !== 'pending') continue;
    // eslint-disable-next-line no-await-in-loop
    await postLedger({
      seller: item.seller,
      type: 'CREDIT_PENDING',
      amount: item.sellerReceivableAmount,
      order: order._id,
      note: `Order ${order.orderNumber}`,
      refKey: `credit:${order._id}:${item._id}`,
    });
    // eslint-disable-next-line no-await-in-loop
    await notify(order, item, 'order_sold');
  }
  order.sellerCredited = true;
  await order.save();
}

// Matures eligible lines (delivered + return window elapsed) from pending -> available.
// Safe to run repeatedly; only processes lines still in 'pending'.
export async function runSettlement() {
  const settings = await CommissionSettings.getSettings();
  const cutoff = new Date(Date.now() - settings.returnWindowDays * 24 * 60 * 60 * 1000);

  const orders = await Order.find({
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    deliveredAt: { $lte: cutoff },
    'items.isMarketplace': true,
    'items.settlementStatus': 'pending',
  });

  let matured = 0;
  for (const order of orders) {
    let changed = false;
    for (const item of order.items) {
      if (!item.isMarketplace || item.settlementStatus !== 'pending') continue;
      // eslint-disable-next-line no-await-in-loop
      await postLedger({
        seller: item.seller,
        type: 'MATURE_AVAILABLE',
        amount: item.sellerReceivableAmount,
        order: order._id,
        note: `Settled order ${order.orderNumber}`,
        refKey: `mature:${order._id}:${item._id}`,
      });
      item.settlementStatus = 'settled';
      changed = true;
      matured += 1;
      // eslint-disable-next-line no-await-in-loop
      await notify(order, item, 'settlement_available');
    }
    if (changed) await order.save();
  }
  return { matured, ordersProcessed: orders.length };
}

// Reverses seller credits when an order is refunded/cancelled.
// pending lines debit the pending bucket; settled lines debit available (may go negative,
// recovered from the next payout). Marks affected lines 'refunded'.
export async function reverseOrderCredits(order, { note = '' } = {}) {
  for (const item of order.items) {
    if (!item.isMarketplace || !item.seller) continue;
    if (item.settlementStatus !== 'pending' && item.settlementStatus !== 'settled') continue;

    const from = item.settlementStatus === 'pending' ? 'pendingAmount' : 'availableAmount';
    // eslint-disable-next-line no-await-in-loop
    await postLedger({
      seller: item.seller,
      type: 'REFUND_DEBIT',
      amount: item.sellerReceivableAmount,
      order: order._id,
      from,
      note: note || `Refund order ${order.orderNumber}`,
      refKey: `refund:${order._id}:${item._id}`,
    });
    item.settlementStatus = 'refunded';
  }
  await order.save();
}
