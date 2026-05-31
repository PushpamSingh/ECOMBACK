import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Banner from '../models/Banner.js';
import { containsFilter } from '../utils/sanitize.js';
import { buildTransformUrl } from '../services/cloudinary.service.js';

// Derive an optimized thumbnail from the desktop image (Cloudinary transform).
const deriveThumbnail = (desktopImage) =>
  buildTransformUrl(desktopImage, 'c_fill,w_400,h_146,f_auto,q_auto');

// ---- Public: live banners for the storefront carousel ----
export const listLiveBanners = asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = {
    isActive: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  };
  if (req.query.type) filter.bannerType = req.query.type;

  const banners = await Banner.find(filter).sort({ displayOrder: 1, createdAt: 1 }).lean();
  sendSuccess(res, { data: banners });
});

// ---- Admin ----
export const listBannersAdmin = asyncHandler(async (req, res) => {
  const { q, type, status } = req.query;
  const filter = {};
  if (q) filter.title = containsFilter(q);
  if (type) filter.bannerType = type;
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const banners = await Banner.find(filter).sort({ displayOrder: 1, createdAt: 1 }).lean();
  sendSuccess(res, { data: banners });
});

export const getBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id).lean();
  if (!banner) throw new ApiError(404, 'Banner not found');
  sendSuccess(res, { data: banner });
});

export const createBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.create({
    ...req.body,
    thumbnail: req.body.thumbnail || deriveThumbnail(req.body.desktopImage),
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });
  sendSuccess(res, { status: 201, message: 'Banner created', data: banner });
});

export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new ApiError(404, 'Banner not found');
  banner.set({ ...req.body, updatedBy: req.user._id });
  if (req.body.desktopImage && !req.body.thumbnail) {
    banner.thumbnail = deriveThumbnail(req.body.desktopImage);
  }
  await banner.save();
  sendSuccess(res, { message: 'Banner updated', data: banner });
});

export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw new ApiError(404, 'Banner not found');
  sendSuccess(res, { message: 'Banner deleted' });
});

export const setBannerStatus = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(
    req.params.id,
    { isActive: req.body.isActive, updatedBy: req.user._id },
    { new: true }
  );
  if (!banner) throw new ApiError(404, 'Banner not found');
  sendSuccess(res, { message: `Banner ${banner.isActive ? 'activated' : 'deactivated'}`, data: banner });
});

export const reorderBanners = asyncHandler(async (req, res) => {
  const ops = req.body.order.map((o) => ({
    updateOne: { filter: { _id: o.id }, update: { $set: { displayOrder: o.displayOrder } } },
  }));
  if (ops.length) await Banner.bulkWrite(ops);
  sendSuccess(res, { message: 'Order updated' });
});
