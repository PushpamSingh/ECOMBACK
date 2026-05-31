import mongoose from 'mongoose';

// Payout destination: either a UPI id or a bank account.
const sellerBankDetailsSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, unique: true },
    method: { type: String, enum: ['upi', 'bank'], required: true },

    // UPI
    upiId: { type: String, default: '' },

    // Bank account
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('SellerBankDetails', sellerBankDetailsSchema);
