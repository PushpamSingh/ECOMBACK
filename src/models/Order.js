import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    image: String,
    price: Number, // unit price paid
    quantity: Number,

    // Marketplace economics — snapshotted at order time, NEVER recalculated later.
    isMarketplace: { type: Boolean, default: false },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null },
    sellerProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProduct', default: null },
    productPrice: { type: Number, default: 0 }, // line total (price * quantity) at sale
    commissionPercentage: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    sellerReceivableAmount: { type: Number, default: 0 },
    settlementStatus: {
      type: String,
      enum: ['none', 'pending', 'settled', 'refunded', 'disputed'],
      default: 'none',
    },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    phone: String,
    street: String,
    apartment: String,
    city: String,
    state: String,
    postCode: String,
    country: { type: String, default: 'India' },
    notes: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true }, // unique already creates the index
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,

    subtotal: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },

    paymentMethod: {
      type: String,
      enum: ['cod', 'razorpay', 'bank_transfer', 'check'],
      default: 'cod',
    },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      default: 'pending',
    },

    razorpay: {
      orderId: String,
      paymentId: String,
      signature: String,
    },

    // Set when the order is marked delivered — starts the settlement return window.
    deliveredAt: { type: Date },
    // True once marketplace lines have been credited to seller wallets (idempotency guard).
    sellerCredited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.pre('validate', function setOrderNumber(next) {
  if (!this.orderNumber) {
    this.orderNumber = `AK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
  }
  next();
});

export default mongoose.model('Order', orderSchema);
