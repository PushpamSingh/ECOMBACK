import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['open', 'under_review', 'resolved'], default: 'open' },
    resolution: { type: String, enum: ['', 'buyer_wins', 'seller_wins', 'partial'], default: '' },
    refundAmount: { type: Number, default: 0 },
    adminNotes: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Dispute', disputeSchema);
