import mongoose from 'mongoose';
import type { ModuleCode } from '@shop/shared';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { hashPassword } from '../auth/auth.service.js';
import { PlanModel } from '../plans/plans.model.js';
import { ShopModel } from '../shops/shops.model.js';
import { SubscriptionModel } from '../subscriptions/subscriptions.model.js';
import { UserModel } from '../users/users.model.js';
import { writeAudit, type AuditActorRef } from '../audit/audit.service.js';
import type {
  AssignPlanInput,
  CreateShopInput,
  SetModulesInput,
  UpdateShopInput,
} from './admin.schemas.js';

export const listShops = async (
  page: number,
  limit: number,
): Promise<{
  items: unknown[];
  page: number;
  limit: number;
  total: number;
}> => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    ShopModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ShopModel.countDocuments(),
  ]);
  return { items, page, limit, total };
};

export const getShopById = async (
  shopId: string,
): Promise<{ shop: unknown; subscription: unknown | null }> => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
  }
  const shop = await ShopModel.findById(shopId).lean();
  if (shop === null) {
    throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
  }
  const subscription = await SubscriptionModel.findOne({ shopId: shop._id }).lean();
  return { shop, subscription };
};

const now = (): Date => new Date();

const dayMs = 24 * 60 * 60 * 1000;

export const createShopWithOwner = async (
  input: CreateShopInput,
  actor: AuditActorRef,
): Promise<{ shopId: string; ownerId: string; subscriptionId: string }> => {
  const plan = await PlanModel.findOne({ code: input.planCode.toLowerCase(), isActive: true });
  if (plan === null) {
    throw new AppError('PLAN_NOT_FOUND', 404, 'Plan not found');
  }

  const session = await mongoose.startSession();
  try {
    let output: { shopId: string; ownerId: string; subscriptionId: string } | null =
      null;
    await session.withTransaction(async () => {
      const [shop] = await ShopModel.create([input.shop], { session });
      if (shop === undefined) throw new Error('shop create returned no doc');

      const passwordHash = await hashPassword(input.owner.password);
      const [owner] = await UserModel.create(
        [
          {
            shopId: shop._id,
            email: input.owner.email.toLowerCase(),
            passwordHash,
            name: input.owner.name,
            role: 'owner',
          },
        ],
        { session },
      );
      if (owner === undefined) throw new Error('owner create returned no doc');

      const start = now();
      const trialDays = plan.trialDays > 0 ? plan.trialDays : 30;
      const periodEnd = new Date(start.getTime() + trialDays * dayMs);
      const [subscription] = await SubscriptionModel.create(
        [
          {
            shopId: shop._id,
            planCode: plan.code,
            effectiveModules: [...plan.modules],
            status: plan.trialDays > 0 ? 'trial' : 'active',
            periodStartAt: start,
            periodEndAt: periodEnd,
            graceDays: plan.graceDays,
          },
        ],
        { session },
      );
      if (subscription === undefined) throw new Error('subscription create returned no doc');

      await writeAudit(
        {
          actor,
          action: 'shop.create',
          resourceType: 'shop',
          resourceId: shop._id,
          shopId: shop._id,
          after: {
            shop: { name: shop.name, phone: shop.phone },
            owner: { email: owner.email, name: owner.name },
            subscription: {
              planCode: subscription.planCode,
              status: subscription.status,
            },
          },
        },
        session,
      );

      output = {
        shopId: shop._id.toString(),
        ownerId: owner._id.toString(),
        subscriptionId: subscription._id.toString(),
      };
    });
    if (output === null) throw new Error('transaction did not produce output');
    return output;
  } catch (err: unknown) {
    if (isDuplicateKey(err)) {
      throw new AppError(ErrorCode.CONFLICT, 409, 'Duplicate shop or owner email');
    }
    throw err;
  } finally {
    session.endSession();
  }
};

export const updateShop = async (
  shopId: string,
  input: UpdateShopInput,
  actor: AuditActorRef,
): Promise<unknown> => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
  }
  const before = await ShopModel.findById(shopId).lean();
  if (before === null) throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');

  const session = await mongoose.startSession();
  try {
    let updated: unknown = null;
    await session.withTransaction(async () => {
      const doc = await ShopModel.findByIdAndUpdate(
        shopId,
        { $set: input },
        { new: true, session },
      );
      if (doc === null) throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
      updated = doc.toObject();
      await writeAudit(
        {
          actor,
          action: 'shop.update',
          resourceType: 'shop',
          resourceId: doc._id,
          shopId: doc._id,
          before: pluck(before, Object.keys(input)),
          after: input as Record<string, unknown>,
        },
        session,
      );
    });
    return updated;
  } finally {
    session.endSession();
  }
};

export const assignPlan = async (
  shopId: string,
  input: AssignPlanInput,
  actor: AuditActorRef,
): Promise<unknown> => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
  }
  const plan = await PlanModel.findOne({ code: input.planCode.toLowerCase(), isActive: true });
  if (plan === null) throw new AppError('PLAN_NOT_FOUND', 404, 'Plan not found');
  const shop = await ShopModel.findById(shopId);
  if (shop === null) throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');

  const session = await mongoose.startSession();
  try {
    let result: unknown = null;
    await session.withTransaction(async () => {
      const existing = await SubscriptionModel.findOne({ shopId: shop._id }).session(
        session,
      );
      const start = now();
      const desiredStatus = input.status ?? (plan.trialDays > 0 ? 'trial' : 'active');
      const trialDays = plan.trialDays > 0 ? plan.trialDays : 30;
      const periodEnd = new Date(start.getTime() + trialDays * dayMs);
      const patch = {
        shopId: shop._id,
        planCode: plan.code,
        effectiveModules: [...plan.modules],
        status: desiredStatus,
        periodStartAt: start,
        periodEndAt: periodEnd,
        graceDays: plan.graceDays,
      };
      const before =
        existing === null
          ? null
          : (existing.toObject() as unknown as Record<string, unknown>);
      const updated = existing === null
        ? (await SubscriptionModel.create([patch], { session }))[0]
        : await SubscriptionModel.findByIdAndUpdate(existing._id, { $set: patch }, {
            new: true,
            session,
          });
      if (updated === undefined || updated === null) throw new Error('subscription upsert failed');
      const auditParams: Parameters<typeof writeAudit>[0] = {
        actor,
        action: 'subscription.assign',
        resourceType: 'subscription',
        resourceId: updated._id,
        shopId: shop._id,
        after: {
          planCode: patch.planCode,
          status: patch.status,
          effectiveModules: patch.effectiveModules,
        },
      };
      if (before !== null) auditParams.before = before;
      await writeAudit(auditParams, session);
      result = updated.toObject();
    });
    return result;
  } finally {
    session.endSession();
  }
};

export const setEffectiveModules = async (
  shopId: string,
  input: SetModulesInput,
  actor: AuditActorRef,
): Promise<unknown> => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
  }
  const shop = await ShopModel.findById(shopId);
  if (shop === null) throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');

  const session = await mongoose.startSession();
  try {
    let result: unknown = null;
    await session.withTransaction(async () => {
      const existing = await SubscriptionModel.findOne({ shopId: shop._id }).session(
        session,
      );
      if (existing === null) {
        throw new AppError(
          'SUBSCRIPTION_NOT_FOUND',
          409,
          'Assign a plan before toggling modules',
        );
      }
      const before = { effectiveModules: [...existing.effectiveModules] as ModuleCode[] };
      existing.effectiveModules = [...input.effectiveModules];
      await existing.save({ session });
      await writeAudit(
        {
          actor,
          action: 'subscription.modules.set',
          resourceType: 'subscription',
          resourceId: existing._id,
          shopId: shop._id,
          before,
          after: { effectiveModules: input.effectiveModules },
        },
        session,
      );
      result = existing.toObject();
    });
    return result;
  } finally {
    session.endSession();
  }
};

export const listPlans = async (): Promise<unknown[]> => {
  return PlanModel.find().sort({ code: 1 }).lean();
};

const pluck = (
  source: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (Object.hasOwn(source, k)) out[k] = source[k];
  }
  return out;
};

const isDuplicateKey = (err: unknown): boolean =>
  err instanceof Error && 'code' in err && (err as { code: unknown }).code === 11000;
