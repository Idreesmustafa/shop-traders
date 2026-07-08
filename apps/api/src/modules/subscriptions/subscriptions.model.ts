import mongoose from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';
import { MODULE_CODES } from '@shop/shared';

export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'grace', 'suspended'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

const subscriptionSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    planCode: { type: String, required: true, lowercase: true },
    effectiveModules: {
      type: [{ type: String, enum: MODULE_CODES }],
      required: true,
      default: [],
    },
    status: { type: String, required: true, enum: SUBSCRIPTION_STATUSES },
    periodStartAt: { type: Date, required: true },
    periodEndAt: { type: Date, required: true },
    graceDays: { type: Number, required: true, min: 0, default: 7 },
  },
  { timestamps: true, strict: 'throw', autoIndex: false },
);

subscriptionSchema.index({ shopId: 1 }, { unique: true });
subscriptionSchema.index({ status: 1, periodEndAt: 1 });

subscriptionSchema.virtual('graceEndAt').get(function () {
  const end = this.periodEndAt.getTime();
  return new Date(end + this.graceDays * 24 * 60 * 60 * 1000);
});

subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

export type Subscription = InferSchemaType<typeof subscriptionSchema>;
export const SubscriptionModel: Model<Subscription> = mongoose.model<Subscription>(
  'Subscription',
  subscriptionSchema,
);
