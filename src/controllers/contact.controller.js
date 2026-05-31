import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import ContactMessage from '../models/ContactMessage.js';

export const createMessage = asyncHandler(async (req, res) => {
  await ContactMessage.create(req.body);
  sendSuccess(res, { status: 201, message: 'Message sent. We will get back to you soon.' });
});

export const listMessages = asyncHandler(async (req, res) => {
  const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();
  sendSuccess(res, { data: messages });
});

export const markMessageRead = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { status: 'read' },
    { new: true }
  );
  if (!message) throw new ApiError(404, 'Message not found');
  sendSuccess(res, { message: 'Marked as read', data: message });
});
