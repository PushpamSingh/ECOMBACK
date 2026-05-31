import mongoose from 'mongoose';

// Singleton marketplace configuration. Commission changes only affect future sales
// (each order snapshots the rate); old orders keep their stored commission.
const commissionSettingsSchema = new mongoose.Schema(
  {
    commissionType: { type: String, enum: ['percentage'], default: 'percentage' },
    commissionValue: { type: Number, default: 10, min: 0, max: 100 }, // percent
    returnWindowDays: { type: Number, default: 7, min: 0 },
    payoutMinAmount: { type: Number, default: 0, min: 0 },
    requireAadhaar: { type: Boolean, default: false },
    requirePan: { type: Boolean, default: false },
    history: [
      {
        commissionValue: Number,
        returnWindowDays: Number,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: () => new Date() },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

commissionSettingsSchema.statics.getSettings = async function getSettings() {
  return this.findOneAndUpdate({}, { $setOnInsert: {} }, { new: true, upsert: true, setDefaultsOnInsert: true });
};

export default mongoose.model('CommissionSettings', commissionSettingsSchema);
