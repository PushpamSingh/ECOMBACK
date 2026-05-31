import mongoose from 'mongoose';

// Seller's product submission + review lifecycle. On PUBLISH a linked Product
// (source: 'marketplace') is created so the existing catalog/cart/checkout reuse works.
export const SELLER_PRODUCT_STATUS = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_CHANGES',
  'PUBLISHED',
  'UNPUBLISHED',
  'SOLD_OUT',
  'BLOCKED',
];

const sellerProductSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },

    // Product info
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    brand: { type: String, default: '' },
    sku: { type: String, unique: true }, // auto-generated
    condition: { type: String, enum: ['new', 'refurbished', 'used'], default: 'new' },

    // Pricing & inventory
    sellingPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },

    // Media (Cloudinary URLs)
    mainImage: { type: String, default: '' },
    gallery: [{ type: String }],

    // Shipping
    weight: { type: Number, default: 0 },
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },

    // Other
    warranty: { type: String, default: '' },
    returnPolicy: { type: String, default: '' },

    status: { type: String, enum: SELLER_PRODUCT_STATUS, default: 'DRAFT', index: true },
    adminNotes: { type: String, default: '' },

    // Linked live catalog product once published.
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  },
  { timestamps: true }
);

sellerProductSchema.pre('validate', function genSku(next) {
  if (!this.sku) {
    this.sku = `MP-${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 900 + 100)}`;
  }
  next();
});

export default mongoose.model('SellerProduct', sellerProductSchema);
