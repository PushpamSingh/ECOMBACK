import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import Wishlist from '../models/Wishlist.js';

async function getOrCreate(userId) {
  // upsert avoids a duplicate-key race on first use.
  return Wishlist.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, products: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
    path: 'products',
    populate: { path: 'category', select: 'name slug' },
  });
  const products = (wishlist?.products || []).map((p) => p.toJSON({ virtuals: true }));
  sendSuccess(res, { data: products });
});

// Toggle: add if missing, remove if present.
export const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const wishlist = await getOrCreate(req.user._id);
  const exists = wishlist.products.some((p) => String(p) === String(productId));
  wishlist.products = exists
    ? wishlist.products.filter((p) => String(p) !== String(productId))
    : [...wishlist.products, productId];
  await wishlist.save();
  sendSuccess(res, {
    message: exists ? 'Removed from wishlist' : 'Added to wishlist',
    data: { productIds: wishlist.products, added: !exists },
  });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreate(req.user._id);
  wishlist.products = wishlist.products.filter((p) => String(p) !== String(req.params.productId));
  await wishlist.save();
  sendSuccess(res, { message: 'Removed from wishlist', data: { productIds: wishlist.products } });
});
