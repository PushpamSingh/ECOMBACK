import multer from 'multer';
import ApiError from '../utils/ApiError.js';

// Keep files in memory; the cloudinary service streams the buffer onward.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new ApiError(400, 'Only image files are allowed'));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, matching the admin UI hint
});
