import Review from '../models/Review.js';
import Product from '../models/Product.js';

// Recomputes a product's average rating and review count from approved reviews.
export async function recalcProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const { avg = 0, count = 0 } = stats[0] || {};
  await Product.findByIdAndUpdate(productId, {
    rating: Math.round(avg * 10) / 10,
    numReviews: count,
  });
}
