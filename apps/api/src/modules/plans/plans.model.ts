import mongoose from 'mongoose';
import type { InferSchemaType, Model } from 'mongoose';
import { MODULE_CODES } from '@shop/shared';

const planSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    modules: {
      type: [{ type: String, enum: MODULE_CODES }],
      required: true,
      default: [],
    },
    limits: {
      maxUsers: { type: Number, required: true, min: 1 },
    },
    pricePaisa: { type: Number, required: true, min: 0 },
    billingCycle: { type: String, required: true, enum: ['monthly', 'yearly'] },
    trialDays: { type: Number, default: 0, min: 0 },
    graceDays: { type: Number, default: 7, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: 'throw', autoIndex: false },
);

planSchema.index({ code: 1 }, { unique: true });
planSchema.index({ isActive: 1 });

export type Plan = InferSchemaType<typeof planSchema>;
export const PlanModel: Model<Plan> = mongoose.model<Plan>('Plan', planSchema);
