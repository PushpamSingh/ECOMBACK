import mongoose from 'mongoose';

// Single-document collection holding store-wide configuration.
const siteSettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: 'AgarbattiKart' },
    siteUrl: { type: String, default: 'http://localhost:5173' },
    adminEmail: { type: String, default: 'support@agarbattikart.com' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    postCode: { type: String, default: '' },
    logo: { type: String, default: '' },
    favicon: { type: String, default: '' },

    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    dateFormat: { type: String, default: 'DD-MM-YYYY' },

    taxRate: { type: Number, default: 0 }, // percent applied to subtotal
    shippingFee: { type: Number, default: 0 },
    freeShippingThreshold: { type: Number, default: 0 }, // 0 = always charge shippingFee

    paymentMethods: {
      cod: { type: Boolean, default: true },
      razorpay: { type: Boolean, default: true },
      bank_transfer: { type: Boolean, default: false },
      check: { type: Boolean, default: false },
    },

    socials: {
      facebook: { type: String, default: '' },
      twitter: { type: String, default: '' },
      instagram: { type: String, default: '' },
      linkedin: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Always work with one settings document (upsert avoids duplicate docs on first run).
siteSettingsSchema.statics.getSettings = async function getSettings() {
  return this.findOneAndUpdate({}, { $setOnInsert: {} }, { new: true, upsert: true, setDefaultsOnInsert: true });
};

export default mongoose.model('SiteSettings', siteSettingsSchema);
