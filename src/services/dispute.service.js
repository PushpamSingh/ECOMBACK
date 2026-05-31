import Dispute from '../models/Dispute.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import { postLedger } from './wallet.service.js';
import { reverseOrderCredits } from './settlement.service.js';
import { notify } from './notification.service.js';

// Buyer raises a dispute on their own marketplace order. Pauses settlement for the
// affected lines (they won't mature/settle while 'disputed').
export async function raiseDispute({ order, buyer, reason }) {
  const marketplaceLine = order.items.find((i) => i.isMarketplace && i.seller);
  if (!marketplaceLine) throw new ApiError(400, 'This order has no marketplace items to dispute');

  const existing = await Dispute.findOne({ order: order._id, status: { $ne: 'resolved' } });
  if (existing) throw new ApiError(409, 'A dispute is already open for this order');

  const dispute = await Dispute.create({
    order: order._id,
    seller: marketplaceLine.seller,
    buyer,
    reason,
    status: 'open',
  });

  // Pause settlement on still-eligible lines.
  for (const item of order.items) {
    if (item.isMarketplace && ['pending', 'settled'].includes(item.settlementStatus)) {
      item.settlementStatus = 'disputed';
    }
  }
  await order.save();
  await notify(order, marketplaceLine.seller, 'dispute_raised');
  return dispute;
}

// Admin resolves a dispute and applies the money outcome.
export async function resolveDispute({ dispute, resolution, refundAmount = 0, adminNotes, admin }) {
  if (dispute.status === 'resolved') throw new ApiError(409, 'Dispute already resolved');
  const order = await Order.findById(dispute.order);
  if (!order) throw new ApiError(404, 'Order not found');

  if (resolution === 'buyer_wins') {
    // Full refund: claw back seller credit for disputed lines, refund the order.
    for (const item of order.items) {
      if (item.isMarketplace && item.settlementStatus === 'disputed') {
        const from = 'availableAmount'; // disputed funds were credited; reclaim from available/pending
        // eslint-disable-next-line no-await-in-loop
        await postLedger({
          seller: item.seller,
          type: 'REFUND_DEBIT',
          amount: item.sellerReceivableAmount,
          order: order._id,
          from,
          note: `Dispute (buyer wins) order ${order.orderNumber}`,
          refKey: `dispute-refund:${order._id}:${item._id}`,
        });
        item.settlementStatus = 'refunded';
      }
    }
    order.paymentStatus = 'refunded';
    order.orderStatus = 'refunded';
    await order.save();
  } else if (resolution === 'seller_wins') {
    // Release: disputed lines go back to 'pending' so normal settlement resumes.
    for (const item of order.items) {
      if (item.isMarketplace && item.settlementStatus === 'disputed') item.settlementStatus = 'pending';
    }
    await order.save();
  } else if (resolution === 'partial') {
    const ratio = order.total > 0 ? Math.min(1, refundAmount / order.total) : 0;
    for (const item of order.items) {
      if (item.isMarketplace && item.settlementStatus === 'disputed') {
        const debit = Math.round(item.sellerReceivableAmount * ratio);
        if (debit > 0) {
          // eslint-disable-next-line no-await-in-loop
          await postLedger({
            seller: item.seller,
            type: 'REFUND_DEBIT',
            amount: debit,
            order: order._id,
            from: 'availableAmount',
            note: `Dispute (partial ${refundAmount}) order ${order.orderNumber}`,
            refKey: `dispute-partial:${order._id}:${item._id}`,
          });
        }
        item.settlementStatus = 'pending'; // remainder settles normally
      }
    }
    await order.save();
  }

  dispute.status = 'resolved';
  dispute.resolution = resolution;
  dispute.refundAmount = refundAmount;
  dispute.adminNotes = adminNotes;
  dispute.resolvedBy = admin;
  dispute.resolvedAt = new Date();
  await dispute.save();
  await notify(order, dispute.seller, 'dispute_resolved');
  return dispute;
}

export { reverseOrderCredits };
