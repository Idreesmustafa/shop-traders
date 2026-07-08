import mongoose from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: {
      line1: { type: String, trim: true },
      city: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    timezone: { type: String, default: 'Asia/Karachi' },
    currency: { type: String, default: 'PKR' },
    pricesIncludeTax: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, strict: 'throw', autoIndex: false },
);

shopSchema.index({ name: 1 });
shopSchema.index({ isActive: 1, createdAt: -1 });

export type Shop = InferSchemaType<typeof shopSchema>;
export const ShopModel: Model<Shop> = mongoose.model<Shop>('Shop', shopSchema);
