import { asyncHandler } from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import Seller from '../models/Seller.js';

// Loads the seller profile for the authenticated user onto req.seller.
// Must run after `protect`.
export const requireSeller = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ user: req.user._id });
  if (!seller) throw new ApiError(403, 'You are not registered as a seller');
  if (seller.status === 'blocked') throw new ApiError(403, 'Your seller account is blocked');
  req.seller = seller;
  next();
});

// Requires the seller to be approved/active (e.g. to submit/sell products).
export const requireApprovedSeller = asyncHandler(async (req, res, next) => {
  const seller = req.seller || (await Seller.findOne({ user: req.user._id }));
  if (!seller) throw new ApiError(403, 'You are not registered as a seller');
  if (seller.status !== 'active') {
    throw new ApiError(403, 'Your seller account is not active yet');
  }
  req.seller = seller;
  next();
});
