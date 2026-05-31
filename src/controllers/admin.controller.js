import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import { containsFilter } from '../utils/sanitize.js';
import Seller from '../models/Seller.js';
import SellerProduct from '../models/SellerProduct.js';
import Payout from '../models/Payout.js';

// Dashboard metrics + chart data, all derived from the database.
export const getDashboard = asyncHandler(async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [ordersReceived, pendingOrders, newCustomers, revenueAgg] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ orderStatus: 'pending' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: startOfMonth } }),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);
  const totalRevenue = revenueAgg[0]?.total || 0;

  // Sales by month for the current year (line chart).
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const salesByMonthAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: yearStart } } },
    { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$total' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const salesByMonth = Array.from({ length: 12 }, (_, i) => {
    const found = salesByMonthAgg.find((m) => m._id === i + 1);
    return { month: i + 1, total: found?.total || 0, count: found?.count || 0 };
  });

  // Top selling categories (pie chart) from order line items.
  const topCategories = await Order.aggregate([
    { $unwind: '$items' },
    {
      $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' },
    },
    { $unwind: '$product' },
    {
      $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' },
    },
    { $unwind: '$category' },
    { $group: { _id: '$category.name', sold: { $sum: '$items.quantity' } } },
    { $sort: { sold: -1 } },
    { $limit: 6 },
  ]);

  const [recentOrders, recentTransactions] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).limit(6).populate('user', 'name avatar').lean(),
    Transaction.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name avatar').lean(),
  ]);

  sendSuccess(res, {
    data: {
      stats: { ordersReceived, totalRevenue, newCustomers, pendingOrders },
      salesByMonth,
      topCategories: topCategories.map((c) => ({ name: c._id, sold: c.sold })),
      recentOrders,
      recentTransactions,
    },
  });
});

// Customers list with derived order counts and spend.
export const listCustomers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = { role: 'customer' };
  if (q) filter.$or = [{ name: containsFilter(q) }, { email: containsFilter(q) }];

  const customers = await User.find(filter).sort({ createdAt: -1 }).lean();
  const orderStats = await Order.aggregate([
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
  ]);
  const statMap = Object.fromEntries(orderStats.map((s) => [String(s._id), s]));

  const data = customers.map((c) => ({
    ...c,
    totalOrders: statMap[String(c._id)]?.orders || 0,
    totalSpent: statMap[String(c._id)]?.spent || 0,
  }));
  sendSuccess(res, { data });
});

export const listTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find()
    .sort({ createdAt: -1 })
    .populate('user', 'name email avatar')
    .populate('order', 'orderNumber total')
    .lean();
  sendSuccess(res, { data: transactions });
});

// Get badge counts for sidebar notifications
export const getNotificationCounts = asyncHandler(async (req, res) => {
  try {
    // Count pending/active orders (not yet delivered or cancelled)
    const pendingOrders = await Order.countDocuments({
      orderStatus: { $in: ['pending', 'processing', 'shipped'] },
    });

    // Count pending sellers (not yet verified)
    const pendingSellers = await Seller.countDocuments({
      status: 'pending',
    });

    // Count products awaiting review (SUBMITTED, UNDER_REVIEW, NEEDS_CHANGES)
    const pendingProductReviews = await SellerProduct.countDocuments({
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES'] },
    });

    // Count payouts in PROCESSING status
    const processingPayouts = await Payout.countDocuments({
      status: 'PROCESSING',
    });

    sendSuccess(res, {
      data: {
        orders: pendingOrders || 0,
        sellers: pendingSellers || 0,
        productReviews: pendingProductReviews || 0,
        payouts: processingPayouts || 0,
      },
    });
  } catch (error) {
    // Return zeros on any error instead of crashing
    sendSuccess(res, {
      data: {
        orders: 0,
        sellers: 0,
        productReviews: 0,
        payouts: 0,
      },
    });
  }
});
