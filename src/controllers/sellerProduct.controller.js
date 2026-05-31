import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import SellerProduct from '../models/SellerProduct.js';
import Product from '../models/Product.js';

const EDITABLE_STATUSES = ['DRAFT', 'NEEDS_CHANGES'];

export const listMyProducts = asyncHandler(async (req, res) => {
  const products = await SellerProduct.find({ seller: req.seller._id })
    .sort({ createdAt: -1 })
    .populate('category', 'name')
    .lean();
  sendSuccess(res, { data: products });
});

export const getMyProduct = asyncHandler(async (req, res) => {
  const product = await SellerProduct.findOne({ _id: req.params.id, seller: req.seller._id }).lean();
  if (!product) throw new ApiError(404, 'Product not found');
  sendSuccess(res, { data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  // Seller can never set status/product directly — always starts as DRAFT.
  const product = await SellerProduct.create({ ...req.body, seller: req.seller._id, status: 'DRAFT' });
  sendSuccess(res, { status: 201, message: 'Draft saved', data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await SellerProduct.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!product) throw new ApiError(404, 'Product not found');
  if (!EDITABLE_STATUSES.includes(product.status)) {
    throw new ApiError(400, `Cannot edit a product in status ${product.status}`);
  }
  // Whitelist editable fields (never status/product/seller).
  const fields = [
    'name', 'description', 'category', 'subCategory', 'brand', 'condition',
    'sellingPrice', 'mrp', 'quantity', 'stock', 'mainImage', 'gallery',
    'weight', 'length', 'width', 'height', 'warranty', 'returnPolicy',
  ];
  fields.forEach((k) => {
    if (req.body[k] !== undefined) product[k] = req.body[k];
  });
  await product.save();
  sendSuccess(res, { message: 'Product updated', data: product });
});

// Submit for review — status-guarded so a double-click can't double-submit.
export const submitProduct = asyncHandler(async (req, res) => {
  const current = await SellerProduct.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!current) throw new ApiError(404, 'Product not found');
  if (!current.mainImage) throw new ApiError(400, 'A main image is required before submitting');
  if (!current.sellingPrice) throw new ApiError(400, 'Selling price is required before submitting');

  const product = await SellerProduct.findOneAndUpdate(
    { _id: req.params.id, seller: req.seller._id, status: { $in: EDITABLE_STATUSES } },
    { status: 'SUBMITTED' },
    { new: true }
  );
  if (!product) throw new ApiError(409, 'Product cannot be submitted in its current status');
  sendSuccess(res, { message: 'Submitted for review', data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await SellerProduct.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!product) throw new ApiError(404, 'Product not found');
  if (product.status !== 'DRAFT') throw new ApiError(400, 'Only draft products can be deleted');
  await product.deleteOne();
  sendSuccess(res, { message: 'Draft deleted' });
});

// Update stock for a published product (syncs the live catalog Product).
export const updateStock = asyncHandler(async (req, res) => {
  const stock = Math.max(0, Number(req.body.stock) || 0);
  const product = await SellerProduct.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!product) throw new ApiError(404, 'Product not found');
  product.stock = stock;
  await product.save();
  if (product.product) await Product.findByIdAndUpdate(product.product, { stock });
  sendSuccess(res, { message: 'Stock updated', data: product });
});
