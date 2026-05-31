import mongoose from 'mongoose';

export const BANNER_TYPES = ['hero', 'offer', 'category', 'promo'];

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },

    desktopImage: { type: String, required: true }, // Cloudinary URL (1920x700-ish)
    mobileImage: { type: String, default: '' }, // optional; falls back to desktop
    thumbnail: { type: String, default: '' }, // small preview/optimized version

    buttonText: { type: String, default: '' },
    buttonLink: { type: String, default: '' },

    bannerType: { type: String, enum: BANNER_TYPES, default: 'hero', index: true },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    // Overlay presentation (configurable per banner).
    textPosition: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    textColor: { type: String, default: '#ffffff' },
    buttonColor: { type: String, default: '#ea580c' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// A banner is "live" when active and the current date falls within its window.
bannerSchema.methods.isLive = function isLive(now = new Date()) {
  if (!this.isActive) return false;
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
};

export default mongoose.model('Banner', bannerSchema);
