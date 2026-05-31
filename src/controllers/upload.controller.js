import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import { uploadBuffer, uploadMany } from '../services/cloudinary.service.js';

// Single image -> returns { url }. Used by category/profile/coupon forms.
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image provided');
  const url = await uploadBuffer(req.file.buffer);
  sendSuccess(res, { message: 'Uploaded', data: { url } });
});

// Multiple images -> returns { urls }. Used by the product gallery.
export const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new ApiError(400, 'No images provided');
  const urls = await uploadMany(req.files);
  sendSuccess(res, { message: 'Uploaded', data: { urls } });
});
