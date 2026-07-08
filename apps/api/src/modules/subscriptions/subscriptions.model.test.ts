import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useMongo } from '../../test-utils/mongo.js';
import { SubscriptionModel } from './subscriptions.model.js';

useMongo();

const baseSub = () => ({
  shopId: new mongoose.Types.ObjectId(),
  planCode: 'starter',
  effectiveModules: ['sales', 'products'],
  status: 'active' as const,
  periodStartAt: new Date('2026-01-01T00:00:00Z'),
  periodEndAt: new Date('2026-02-01T00:00:00Z'),
  graceDays: 7,
});

describe('SubscriptionModel', () => {
  it('computes graceEndAt as periodEndAt + graceDays', async () => {
    const sub = await SubscriptionModel.create(baseSub());
    const graceEnd = (sub.toJSON() as unknown as { graceEndAt: string }).graceEndAt;
    expect(new Date(graceEnd).toISOString()).toBe('2026-02-08T00:00:00.000Z');
  });

  it('allows exactly one subscription per shop', async () => {
    await SubscriptionModel.create(baseSub());
    const dup = { ...baseSub(), shopId: (await SubscriptionModel.findOne())!.shopId };
    await expect(SubscriptionModel.create(dup)).rejects.toThrow();
  });

  it('rejects an unknown status', async () => {
    await expect(
      SubscriptionModel.create({ ...baseSub(), status: 'lapsed' as never }),
    ).rejects.toThrow();
  });
});
