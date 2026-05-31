import mongoose from 'mongoose';

// Immutable record of every admin decision on a seller product.
const adminApprovalHistorySchema = new mongoose.Schema(
  {
    sellerProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProduct', required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: ['approve', 'reject', 'request_changes', 'block', 'publish', 'unpublish'],
      required: true,
    },
    fromStatus: { type: String, default: '' },
    toStatus: { type: String, default: '' },
    notes: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('AdminApprovalHistory', adminApprovalHistorySchema);
