import { describe, expect, it } from 'vitest';
import { useMongo } from '../../test-utils/mongo.js';
import { PlanModel } from './plans.model.js';

useMongo();

const validPlan = {
  code: 'starter',
  name: 'Starter',
  modules: ['sales', 'products'],
  limits: { maxUsers: 5 },
  pricePaisa: 100_000,
  billingCycle: 'monthly' as const,
};

describe('PlanModel', () => {
  it('stores pricePaisa as an integer field', async () => {
    const plan = await PlanModel.create(validPlan);
    expect(plan.pricePaisa).toBe(100_000);
    expect(plan.billingCycle).toBe('monthly');
  });

  it('rejects an unknown module code', async () => {
    await expect(
      PlanModel.create({ ...validPlan, modules: ['imaginary'] }),
    ).rejects.toThrow();
  });

  it('enforces unique plan code', async () => {
    await PlanModel.create(validPlan);
    await expect(PlanModel.create(validPlan)).rejects.toThrow();
  });

  it('rejects negative pricePaisa', async () => {
    await expect(
      PlanModel.create({ ...validPlan, pricePaisa: -1 }),
    ).rejects.toThrow();
  });
});
