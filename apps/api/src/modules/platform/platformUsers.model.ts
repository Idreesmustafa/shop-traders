import mongoose from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';
import { PLATFORM_ROLES } from '@shop/shared';

const platformUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: PLATFORM_ROLES },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', autoIndex: false, collection: 'platformUsers' },
);

platformUserSchema.index({ email: 1 }, { unique: true });

export type PlatformUser = InferSchemaType<typeof platformUserSchema>;
export const PlatformUserModel: Model<PlatformUser> = mongoose.model<PlatformUser>(
  'PlatformUser',
  platformUserSchema,
);
