import Notification from '../models/Notification.js';
import Seller from '../models/Seller.js';

// Low-level: create an in-app notification for a user.
export async function createNotification(user, { type, title, message = '', link = '' }) {
  if (!user) return null;
  return Notification.create({ user, type, title, message, link });
}

const TEMPLATES = {
  order_sold: (o) => ({ title: 'New sale', message: `You sold an item in order ${o.orderNumber}.`, link: '/seller/earnings' }),
  settlement_available: (o) => ({ title: 'Settlement available', message: `Funds from order ${o.orderNumber} are now available.`, link: '/seller/wallet' }),
  settlement_paid: (o) => ({ title: 'Payout paid', message: 'Your payout has been paid.', link: '/seller/settlements' }),
  settlement_failed: () => ({ title: 'Payout failed', message: 'A payout attempt failed. Please check your bank details.', link: '/seller/settlements' }),
  product_approved: (p) => ({ title: 'Product approved', message: `"${p.name}" was approved and published.`, link: '/seller/products' }),
  product_rejected: (p) => ({ title: 'Product rejected', message: `"${p.name}" was rejected.`, link: '/seller/products' }),
  product_needs_changes: (p) => ({ title: 'Changes requested', message: `"${p.name}" needs changes before approval.`, link: '/seller/products' }),
  dispute_raised: (o) => ({ title: 'Dispute raised', message: `A dispute was raised on order ${o.orderNumber}.`, link: '/seller/settlements' }),
  dispute_resolved: (o) => ({ title: 'Dispute resolved', message: `The dispute on order ${o.orderNumber} was resolved.`, link: '/seller/settlements' }),
};

// Resolve a seller's user and notify them using a template keyed by `type`.
// `entity` is the order/product the template needs.
export async function notify(entity, sellerOrItem, type) {
  const sellerId = sellerOrItem?.seller || sellerOrItem;
  if (!sellerId) return;
  const seller = await Seller.findById(sellerId).select('user');
  if (!seller) return;
  const tpl = TEMPLATES[type] ? TEMPLATES[type](entity) : { title: type, message: '' };
  await createNotification(seller.user, { type, ...tpl });
}

// Notify a seller's user directly (when you already have the Seller doc/id).
export async function notifySellerUser(sellerId, type, entity) {
  await notify(entity, sellerId, type);
}
