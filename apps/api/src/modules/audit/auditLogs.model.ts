import mongoose from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

export const AUDIT_ACTOR_TYPES = ['platform_user', 'shop_user', 'system'] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

const auditLogSchema = new mongoose.Schema(
  {
    actorType: { type: String, required: true, enum: AUDIT_ACTOR_TYPES },
    actorId: { type: mongoose.Schema.Types.ObjectId },
    actorEmail: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    resourceType: { type: String, required: true, trim: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: 'throw',
    autoIndex: false,
    collection: 'auditLogs',
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ shopId: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel: Model<AuditLog> = mongoose.model<AuditLog>(
  'AuditLog',
  auditLogSchema,
);
