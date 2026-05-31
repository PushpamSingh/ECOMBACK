import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import Order from '../models/Order.js';
import Dispute from '../models/Dispute.js';
import { raiseDispute } from '../services/dispute.service.js';

// Buyer raises a dispute on their own order.
export const createDispute = asyncHandler(async (req, res) => {
  const { orderId, reason } = req.body;
  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');
  const dispute = await raiseDispute({ order, buyer: req.user._id, reason });
  sendSuccess(res, { status: 201, message: 'Dispute raised', data: dispute });
});

export const listMyDisputes = asyncHandler(async (req, res) => {
  const disputes = await Dispute.find({ buyer: req.user._id })
    .sort({ createdAt: -1 })
    .populate('order', 'orderNumber total')
    .lean();
  sendSuccess(res, { data: disputes });
});
