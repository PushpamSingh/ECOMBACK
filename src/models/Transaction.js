import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: {
      type: String,
      enum: ['cod', 'razorpay', 'bank_transfer', 'check'],
      default: 'cod',
    },
    status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
    gatewayPaymentId: { type: String, default: '' },
    gatewayOrderId: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
