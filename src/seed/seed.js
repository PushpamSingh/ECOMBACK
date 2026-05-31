/* Seeds the database with an admin user, site settings, incense categories,
   products (prices in INR), coupons, reviews and a few sample orders so the
   storefront and admin dashboard show realistic, consistent data.
   Run: npm run seed */
import mongoose from 'mongoose';
import slugify from 'slugify';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import SiteSettings from '../models/SiteSettings.js';
import Banner from '../models/Banner.js';
import { lineUnitPrice, computeTotals } from '../utils/pricing.js';
import { recalcProductRating } from '../services/rating.service.js';

const img = (seed) => `https://picsum.photos/seed/${seed}/700/700`;

const CATEGORIES = [
  { name: 'Incense Sticks', description: 'Classic agarbatti sticks in many fragrances.' },
  { name: 'Dhoop Cones', description: 'Compact, long-lasting dhoop cones.' },
  { name: 'Dhoop Sticks', description: 'Bamboo-less dhoop batti.' },
  { name: 'Sambrani & Loban', description: 'Traditional sambrani cups and loban.' },
  { name: 'Camphor', description: 'Pure camphor tablets for aarti and freshening.' },
  { name: 'Gift Sets', description: 'Curated festive incense gift boxes.' },
];

const PRODUCTS = [
  { name: 'Sandalwood Premium Agarbatti (100g)', cat: 'Incense Sticks', price: 199, discountType: 'percent', discountValue: 15, brand: 'AromaVeda', stock: 120, featured: true, tags: ['sandalwood', 'premium'] },
  { name: 'Rose Garden Incense Sticks (90 sticks)', cat: 'Incense Sticks', price: 149, discountType: 'none', discountValue: 0, brand: 'AromaVeda', stock: 80, featured: true, tags: ['rose', 'floral'] },
  { name: 'Mogra Jasmine Agarbatti (Pack of 6)', cat: 'Incense Sticks', price: 249, discountType: 'fixed', discountValue: 40, brand: 'Divya', stock: 60, tags: ['mogra', 'jasmine'] },
  { name: 'Lavender Calm Incense (50 sticks)', cat: 'Incense Sticks', price: 129, discountType: 'none', discountValue: 0, brand: 'ZenScent', stock: 200, tags: ['lavender'] },
  { name: 'Chandan Dhoop Cones (Box of 24)', cat: 'Dhoop Cones', price: 99, discountType: 'percent', discountValue: 10, brand: 'Divya', stock: 150, featured: true, tags: ['chandan', 'cones'] },
  { name: 'Guggal Dhoop Cones (Box of 24)', cat: 'Dhoop Cones', price: 119, discountType: 'none', discountValue: 0, brand: 'Divya', stock: 90, tags: ['guggal'] },
  { name: 'Bamboo-less Dhoop Sticks (75g)', cat: 'Dhoop Sticks', price: 89, discountType: 'none', discountValue: 0, brand: 'AromaVeda', stock: 110, tags: ['dhoop'] },
  { name: 'Kesar Chandan Dhoop Batti (Pack of 3)', cat: 'Dhoop Sticks', price: 179, discountType: 'percent', discountValue: 20, brand: 'Divya', stock: 70, featured: true, tags: ['kesar', 'chandan'] },
  { name: 'Sambrani Dhoop Cups (12 cups)', cat: 'Sambrani & Loban', price: 159, discountType: 'none', discountValue: 0, brand: 'Traditional', stock: 65, tags: ['sambrani'] },
  { name: 'Pure Loban Sticks (50g)', cat: 'Sambrani & Loban', price: 109, discountType: 'fixed', discountValue: 20, brand: 'Traditional', stock: 85, tags: ['loban'] },
  { name: 'Bhimseni Camphor Tablets (100g)', cat: 'Camphor', price: 139, discountType: 'none', discountValue: 0, brand: 'PureCam', stock: 130, featured: true, tags: ['camphor', 'kapur'] },
  { name: 'Camphor Cubes Refill Pack (250g)', cat: 'Camphor', price: 299, discountType: 'percent', discountValue: 12, brand: 'PureCam', stock: 40, tags: ['camphor'] },
  { name: 'Festive Pooja Incense Gift Box', cat: 'Gift Sets', price: 499, discountType: 'percent', discountValue: 25, brand: 'AromaVeda', stock: 35, featured: true, tags: ['gift', 'festive'] },
  { name: 'Assorted Fragrance Gift Hamper', cat: 'Gift Sets', price: 699, discountType: 'fixed', discountValue: 100, brand: 'AromaVeda', stock: 25, tags: ['gift', 'hamper'] },
];

const REVIEWERS = [
  { name: 'Ananya Sharma', email: 'ananya@example.com' },
  { name: 'Rahul Verma', email: 'rahul@example.com' },
  { name: 'Priya Nair', email: 'priya@example.com' },
  { name: 'Vikram Singh', email: 'vikram@example.com' },
  { name: 'Meera Iyer', email: 'meera@example.com' },
];

const REVIEW_TEXTS = [
  { rating: 5, comment: 'Amazing fragrance, lasts really long. Will order again!' },
  { rating: 4, comment: 'Good quality and natural smell. Packaging could be better.' },
  { rating: 5, comment: 'Perfect for daily pooja. The whole house smells divine.' },
  { rating: 4, comment: 'Value for money. Burns cleanly with little smoke.' },
  { rating: 3, comment: 'Decent product but the scent is a little mild for me.' },
];

const ADDRESS = {
  street: '12 Temple Road',
  city: 'Mysuru',
  state: 'Karnataka',
  postCode: '570001',
  country: 'India',
};

async function ensureUser({ name, email, role = 'customer', password = 'Customer@123' }) {
  let user = await User.findOne({ email });
  if (!user) user = await User.create({ name, email, password, role });
  return user;
}

async function run() {
  await connectDB();
  console.log('Clearing existing data...');
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    Coupon.deleteMany({}),
    Review.deleteMany({}),
    Order.deleteMany({}),
    Transaction.deleteMany({}),
    SiteSettings.deleteMany({}),
    Banner.deleteMany({}),
  ]);

  // Users
  const admin = await ensureUser({ name: env.admin.name, email: env.admin.email, role: 'admin', password: env.admin.password });
  console.log(`Admin: ${env.admin.email} / ${env.admin.password}`);
  const customer = await ensureUser({ name: 'Demo Customer', email: 'customer@agarbattikart.com' });
  console.log('Customer: customer@agarbattikart.com / Customer@123');

  const reviewers = [];
  for (const r of REVIEWERS) {
    // eslint-disable-next-line no-await-in-loop
    reviewers.push(await ensureUser(r));
  }
  const allCustomers = [customer, ...reviewers];

  // Site settings
  const settings = await SiteSettings.create({
    siteName: 'AgarbattiKart',
    adminEmail: 'support@agarbattikart.com',
    phone: '+91 98765 43210',
    address: 'Fragrance Lane, Mysuru, Karnataka, India',
    postCode: '570001',
    currency: 'INR',
    currencySymbol: '₹',
    taxRate: 5,
    shippingFee: 49,
    freeShippingThreshold: 499,
    paymentMethods: { cod: true, razorpay: true, bank_transfer: false, check: false },
  });

  // Categories
  const categoryDocs = {};
  for (const c of CATEGORIES) {
    // eslint-disable-next-line no-await-in-loop
    categoryDocs[c.name] = await Category.create({
      name: c.name,
      slug: slugify(c.name, { lower: true, strict: true }),
      description: c.description,
      image: img(`cat-${c.name}`),
    });
  }
  console.log(`${CATEGORIES.length} categories created.`);

  // Products
  const products = [];
  let i = 1;
  for (const p of PRODUCTS) {
    const images = [img(`prod-${i}-a`), img(`prod-${i}-b`), img(`prod-${i}-c`)];
    // eslint-disable-next-line no-await-in-loop
    const doc = await Product.create({
      name: p.name,
      shortDescription: `${p.brand} • Long-lasting natural fragrance for daily pooja and home.`,
      description: `<p>${p.name} by ${p.brand}. Hand-rolled using natural ingredients for a clean, long-lasting aroma. Perfect for daily prayer, meditation and freshening your space.</p>`,
      price: p.price,
      discountType: p.discountType,
      discountValue: p.discountValue,
      sku: `AK-${1000 + i}`,
      stock: p.stock,
      category: categoryDocs[p.cat]._id,
      brand: p.brand,
      tags: p.tags,
      images,
      thumbnail: images[0],
      featured: !!p.featured,
      status: 'active',
      shipping: { weight: 0.2, cost: 0 },
    });
    products.push(doc);
    i += 1;
  }
  console.log(`${products.length} products created.`);

  // Reviews — 3 per product from distinct reviewers, then recalc ratings.
  let reviewCount = 0;
  for (let p = 0; p < products.length; p += 1) {
    for (let r = 0; r < 3; r += 1) {
      const reviewer = reviewers[(p + r) % reviewers.length];
      const text = REVIEW_TEXTS[(p + r) % REVIEW_TEXTS.length];
      // eslint-disable-next-line no-await-in-loop
      await Review.create({
        product: products[p]._id,
        user: reviewer._id,
        name: reviewer.name,
        rating: text.rating,
        comment: text.comment,
        status: 'approved',
      });
      reviewCount += 1;
    }
    // eslint-disable-next-line no-await-in-loop
    await recalcProductRating(products[p]._id);
  }
  console.log(`${reviewCount} reviews created and product ratings recalculated.`);

  // Coupons
  const now = new Date();
  const inMonths = (n) => new Date(now.getFullYear(), now.getMonth() + n, now.getDate());
  await Coupon.create([
    {
      name: 'Welcome Offer',
      code: 'WELCOME10',
      description: '10% off your first order',
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 199,
      maxDiscount: 100,
      startDate: inMonths(-1),
      endDate: inMonths(3),
      usageLimit: 0,
      isActive: true,
    },
    {
      name: 'Festive Flat 50',
      code: 'FESTIVE50',
      description: 'Flat ₹50 off on orders above ₹499',
      discountType: 'fixed',
      discountValue: 50,
      minOrderValue: 499,
      startDate: inMonths(-1),
      endDate: inMonths(2),
      usageLimit: 100,
      isActive: true,
    },
  ]);
  console.log('2 coupons created.');

  // Sample orders so the dashboard / orders / transactions have data.
  const ORDER_PLAN = [
    { items: [[0, 2], [4, 1]], method: 'razorpay', payment: 'paid', status: 'delivered' },
    { items: [[12, 1]], method: 'razorpay', payment: 'paid', status: 'delivered' },
    { items: [[7, 1], [10, 2]], method: 'cod', payment: 'paid', status: 'processing' },
    { items: [[2, 1]], method: 'cod', payment: 'pending', status: 'pending' },
    { items: [[5, 3]], method: 'razorpay', payment: 'paid', status: 'shipped' },
    { items: [[13, 1], [11, 1]], method: 'razorpay', payment: 'paid', status: 'delivered' },
    { items: [[3, 2]], method: 'cod', payment: 'pending', status: 'pending' },
    { items: [[8, 1]], method: 'cod', payment: 'refunded', status: 'cancelled' },
  ];

  for (let o = 0; o < ORDER_PLAN.length; o += 1) {
    const plan = ORDER_PLAN[o];
    const buyer = allCustomers[o % allCustomers.length];

    const orderItems = plan.items.map(([idx, qty]) => {
      const prod = products[idx];
      return {
        product: prod._id,
        name: prod.name,
        image: prod.thumbnail,
        price: lineUnitPrice(prod),
        quantity: qty,
      };
    });
    const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const { tax, shippingCost, total } = computeTotals({ subtotal, discount: 0, settings });

    // eslint-disable-next-line no-await-in-loop
    const order = await Order.create({
      user: buyer._id,
      items: orderItems,
      shippingAddress: { fullName: buyer.name, email: buyer.email, phone: '+91 90000 0000' + o, ...ADDRESS },
      subtotal,
      shippingCost,
      tax,
      discount: 0,
      total,
      paymentMethod: plan.method,
      paymentStatus: plan.payment,
      orderStatus: plan.status,
    });

    // eslint-disable-next-line no-await-in-loop
    await Transaction.create({
      order: order._id,
      user: buyer._id,
      amount: total,
      method: plan.method,
      status: plan.payment === 'paid' ? 'success' : plan.payment === 'refunded' ? 'refunded' : 'pending',
    });

    // Reduce stock for fulfilled (paid) orders to keep inventory consistent.
    if (plan.payment === 'paid') {
      for (const it of orderItems) {
        // eslint-disable-next-line no-await-in-loop
        await Product.updateOne({ _id: it.product }, { $inc: { stock: -it.quantity } });
      }
    }
  }
  console.log(`${ORDER_PLAN.length} sample orders + transactions created.`);

  // Home hero banners
  const banner = (n) => `https://picsum.photos/seed/ak-banner-${n}/1920/700`;
  const mobileBanner = (n) => `https://picsum.photos/seed/ak-banner-m-${n}/800/1000`;
  await Banner.create([
    {
      title: 'Elevate Every Ritual',
      subtitle: 'Pure & Natural Fragrances',
      description: 'Hand-rolled incense, dhoop and pooja essentials delivered across India.',
      desktopImage: banner(1), mobileImage: mobileBanner(1),
      buttonText: 'Shop Now', buttonLink: '/shop', bannerType: 'hero',
      displayOrder: 1, isActive: true, textPosition: 'left', createdBy: admin._id, updatedBy: admin._id,
    },
    {
      title: 'Festive Gift Sets',
      subtitle: 'Up to 25% Off',
      description: 'Curated incense hampers for the season.',
      desktopImage: banner(2), mobileImage: mobileBanner(2),
      buttonText: 'Explore Gifts', buttonLink: '/shop?category=gift-sets', bannerType: 'offer',
      displayOrder: 2, isActive: true, textPosition: 'center', createdBy: admin._id, updatedBy: admin._id,
    },
    {
      title: 'Daily Pooja Essentials',
      subtitle: 'Free shipping over ₹499',
      description: 'Camphor, sambrani, dhoop cones and more.',
      desktopImage: banner(3), mobileImage: mobileBanner(3),
      buttonText: 'Browse All', buttonLink: '/shop', bannerType: 'promo',
      displayOrder: 3, isActive: true, textPosition: 'right', createdBy: admin._id, updatedBy: admin._id,
    },
  ]);
  console.log('3 banners created.');

  console.log('\nSeed complete.');
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});
