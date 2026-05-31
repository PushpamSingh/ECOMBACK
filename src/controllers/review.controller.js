import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import { recalcProductRating } from '../services/rating.service.js';

// Public: approved reviews for a product.
export const listProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId, status: 'approved' })
    .sort({ createdAt: -1 })
    .lean();
  sendSuccess(res, { data: reviews });
});

// Customer: create or update own review (starts as pending).
export const createReview = asyncHandler(async (req, res) => {
  const { rating, title, comment } = req.body;
  const product = await Product.findById(req.params.productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const review = await Review.findOneAndUpdate(
    { product: product._id, user: req.user._id },
    { rating, title, comment, name: req.user.name, status: 'pending' },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  sendSuccess(res, { status: 201, message: 'Review submitted for approval', data: review });
});

// ----- Admin moderation -----
export const adminListReviews = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const reviews = await Review.find(filter)
    .sort({ createdAt: -1 })
    .populate('product', 'name thumbnail')
    .populate('user', 'name avatar')
    .lean();
  sendSuccess(res, { data: reviews });
});

export const adminUpdateReview = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  review.status = status;
  await review.save();
  await recalcProductRating(review.product);
  sendSuccess(res, { message: 'Review updated', data: review });
});

export const adminDeleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  await recalcProductRating(review.product);
  sendSuccess(res, { message: 'Review deleted' });
});
