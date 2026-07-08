import mongoose from 'mongoose';
import type { ModuleCode } from '@shop/shared';
import {
  SubscriptionModel,
  type SubscriptionStatus,
} from '../subscriptions/subscriptions.model.js';

export type ShopEntitlements = {
  planCode: string;
  status: SubscriptionStatus;
  effectiveModules: readonly ModuleCode[];
  periodStartAt: Date;
  periodEndAt: Date;
  graceDays: number;
  graceEndAt: Date;
};

export const loadShopEntitlements = async (
  shopId: string,
): Promise<ShopEntitlements | null> => {
  const sub = await SubscriptionModel.findOne({
    shopId: new mongoose.Types.ObjectId(shopId),
  });
  if (sub === null) return null;
  const graceEndAt = new Date(
    sub.periodEndAt.getTime() + sub.graceDays * 24 * 60 * 60 * 1000,
  );
  return {
    planCode: sub.planCode,
    status: sub.status,
    effectiveModules: sub.effectiveModules as readonly ModuleCode[],
    periodStartAt: sub.periodStartAt,
    periodEndAt: sub.periodEndAt,
    graceDays: sub.graceDays,
    graceEndAt,
  };
};
