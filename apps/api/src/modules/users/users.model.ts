import mongoose from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';
import { SHOP_ROLES } from '@shop/shared';

const userSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: SHOP_ROLES },
    isActive: { type: Boolean, default: true },
    isSupportBot: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, strict: 'throw', autoIndex: false },
);

userSchema.index({ shopId: 1, email: 1 }, { unique: true });
userSchema.index({ shopId: 1, role: 1 });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel: Model<User> = mongoose.model<User>('User', userSchema);
