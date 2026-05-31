import mongoose from 'mongoose';

// Generic audit trail for sensitive marketplace actions.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entity: { type: String, default: '' }, // e.g. 'SellerProduct', 'Payout'
    entityId: { type: mongoose.Schema.Types.ObjectId },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model('AuditLog', auditLogSchema);
