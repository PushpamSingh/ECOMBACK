import mongoose from 'mongoose';

// One Seller document per User. A user "is a seller" iff this doc exists.
const sellerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Contact / profile
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    pincode: { type: String, required: true },

    // Store
    storeName: { type: String, required: true, trim: true },
    storeDescription: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'blocked'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Seller', sellerSchema);
