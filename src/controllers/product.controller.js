import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { containsFilter } from '../utils/sanitize.js';

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { rating: -1 },
  popular: { numReviews: -1 },
};

// Public listing with filters, sorting and pagination (shop page).
export const listProducts = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    brand,
    color,
    minPrice,
    maxPrice,
    rating,
    sort = 'newest',
    featured,
    page = 1,
    limit = 12,
  } = req.query;

  const filter = { status: 'active' };

  // Guard numeric query params so malformed values (e.g. ?rating=abc) don't break the query.
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
  const ratingNum = num(rating);
  const minP = num(minPrice);
  const maxP = num(maxPrice);

  if (q) filter.$text = { $search: String(q) };
  if (brand) filter.brand = brand;
  if (color) filter.colors = color;
  if (featured === 'true') filter.featured = true;
  if (ratingNum !== undefined) filter.rating = { $gte: ratingNum };

  if (category && /^[0-9a-fA-F]{24}$|^[a-z0-9-]+$/i.test(category)) {
    // Accept either an id or a slug.
    const cat = category.match(/^[0-9a-fA-F]{24}$/)
      ? await Category.findById(category)
      : await Category.findOne({ slug: category });
    if (cat) filter.$or = [{ category: cat._id }, { subCategory: cat._id }];
  }

  if (minP !== undefined || maxP !== undefined) {
    filter.price = {};
    if (minP !== undefined) filter.price.$gte = minP;
    if (maxP !== undefined) filter.price.$lte = maxP;
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(60, Math.max(1, Number(limit) || 12));

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[sort] || SORTS.newest)
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate('category', 'name slug')
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: items,
    meta: { page: pageNum, limit: perPage, total, pages: Math.ceil(total / perPage) },
  });
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .lean({ virtuals: true });
  if (!product) throw new ApiError(404, 'Product not found');

  // Related products from the same category (skip if category is missing).
  const related = product.category?._id
    ? await Product.find({
        _id: { $ne: product._id },
        category: product.category._id,
        status: 'active',
      })
        .sort({ rating: -1, createdAt: -1 })
        .limit(8)
        .lean({ virtuals: true })
    : [];

  sendSuccess(res, { data: { product, related } });
});

// Admin: full list with search + status filter + pagination.
export const listProductsAdmin = asyncHandler(async (req, res) => {
  const { q, status, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (q) filter.name = containsFilter(q);
  if (status) filter.status = status;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Math.max(1, Number(limit) || 10));

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .populate('category', 'name')
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: items,
    meta: { page: pageNum, limit: perPage, total, pages: Math.ceil(total / perPage) },
  });
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean({ virtuals: true });
  if (!product) throw new ApiError(404, 'Product not found');
  sendSuccess(res, { data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  sendSuccess(res, { status: 201, message: 'Product created', data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  product.set(req.body);
  await product.save();
  sendSuccess(res, { message: 'Product updated', data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  sendSuccess(res, { message: 'Product deleted' });
});
