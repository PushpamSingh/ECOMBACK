import mongoose from 'mongoose';
import slugify from 'slugify';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true }, // unique already creates the index
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' }, // rich HTML from editor

    price: { type: Number, required: true, min: 0 }, // base / MRP price
    discountType: { type: String, enum: ['none', 'fixed', 'percent'], default: 'none' },
    discountValue: { type: Number, default: 0, min: 0 },

    sku: { type: String, default: '' },
    stock: { type: Number, default: 0, min: 0 },

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },

    brand: { type: String, default: '' },
    tags: [{ type: String }],
    colors: [{ type: String }],
    sizes: [{ type: String }],

    images: [{ type: String }],
    thumbnail: { type: String, default: '' },

    shipping: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      weight: { type: Number, default: 0 },
      cost: { type: Number, default: 0 },
    },

    rating: { type: Number, default: 0 }, // average, maintained from reviews
    numReviews: { type: Number, default: 0 },

    featured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive', 'scheduled'],
      default: 'active',
    },

    // Marketplace: store-owned products have source 'store' (default); seller products
    // created on PUBLISH have source 'marketplace' and link back to the seller submission.
    source: { type: String, enum: ['store', 'marketplace'], default: 'store', index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null },
    sellerProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProduct', default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Selling price after applying the configured discount.
productSchema.virtual('finalPrice').get(function finalPrice() {
  if (this.discountType === 'percent') {
    return Math.max(0, Math.round(this.price - (this.price * this.discountValue) / 100));
  }
  if (this.discountType === 'fixed') {
    return Math.max(0, this.price - this.discountValue);
  }
  return this.price;
});

productSchema.virtual('inStock').get(function inStock() {
  return this.stock > 0;
});

productSchema.pre('validate', function setSlug(next) {
  if (this.isModified('name') || !this.slug) {
    const base = slugify(this.name, { lower: true, strict: true });
    this.slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }
  next();
});

productSchema.index({ name: 'text', shortDescription: 'text', tags: 'text' });

// Lets `.lean({ virtuals: true })` include finalPrice/inStock on listing queries.
productSchema.plugin(mongooseLeanVirtuals);

export default mongoose.model('Product', productSchema);
