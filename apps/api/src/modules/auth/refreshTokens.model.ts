import mongoose from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    audience: { type: String, required: true, enum: ['shop', 'admin'] },
    shopId: { type: mongoose.Schema.Types.ObjectId },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByHash: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: 'throw',
    autoIndex: false,
    collection: 'refreshTokens',
  },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ userId: 1, audience: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshTokenModel: Model<RefreshToken> = mongoose.model<RefreshToken>(
  'RefreshToken',
  refreshTokenSchema,
);
