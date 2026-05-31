import mongoose from 'mongoose';

// Identity verification kept separate from the seller profile.
const sellerVerificationSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, unique: true },
    aadhaarNumber: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('SellerVerification', sellerVerificationSchema);
