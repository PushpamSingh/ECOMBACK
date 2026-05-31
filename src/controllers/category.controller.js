import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

// Public: flat list of active categories (frontend builds the menu/tree from `parent`).
export const listCategories = asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ order: 1, name: 1 }).lean();
  sendSuccess(res, { data: categories });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).lean();
  if (!category) throw new ApiError(404, 'Category not found');
  sendSuccess(res, { data: category });
});

// Admin CRUD
export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  sendSuccess(res, { status: 201, message: 'Category created', data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  category.set(req.body);
  await category.save();
  sendSuccess(res, { message: 'Category updated', data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const inUse = await Product.countDocuments({ category: req.params.id });
  if (inUse > 0) throw new ApiError(400, `Cannot delete: ${inUse} product(s) use this category`);
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  sendSuccess(res, { message: 'Category deleted' });
});

// Admin listing with product counts (for the category table "Items" column).
export const listCategoriesAdmin = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ order: 1, name: 1 }).lean();
  const counts = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  const data = categories.map((c) => ({ ...c, itemCount: countMap[String(c._id)] || 0 }));
  sendSuccess(res, { data });
});
