import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler.js';
import { requireModule, requireSubscription } from './entitlements.js';
import * as entitlementsService from '../modules/entitlements/entitlements.service.js';
import type { ShopEntitlements } from '../modules/entitlements/entitlements.service.js';
import type { AuthContext } from './auth.js';

const authAs = (auth: AuthContext) => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  req.auth = auth;
  next();
};

const shopAuth: AuthContext = {
  userId: 'u1',
  role: 'owner',
  shopId: '000000000000000000000001',
  audience: 'shop',
  permissions: [],
};

const mockEntitlements = (ent: ShopEntitlements | null): void => {
  vi.spyOn(entitlementsService, 'loadShopEntitlements').mockResolvedValue(ent);
};

const buildEntitlements = (
  overrides: Partial<ShopEntitlements> = {},
): ShopEntitlements => ({
  planCode: 'starter',
  status: 'active',
  effectiveModules: ['sales', 'products'],
  periodStartAt: new Date('2026-01-01'),
  periodEndAt: new Date('2026-02-01'),
  graceDays: 7,
  graceEndAt: new Date('2026-02-08'),
  ...overrides,
});

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(authAs(shopAuth));
  app.get(
    '/read',
    requireSubscription(),
    requireModule('sales'),
    (_req, res) => res.json({ ok: 'read' }),
  );
  app.post(
    '/write',
    requireSubscription(),
    requireModule('sales'),
    (_req, res) => res.json({ ok: 'write' }),
  );
  app.get(
    '/disabled-module',
    requireSubscription(),
    requireModule('purchases'),
    (_req, res) => res.json({ ok: 'purchases' }),
  );
  app.use(errorHandler);
  return app;
};

describe('requireSubscription', () => {
  it('returns 403 SUBSCRIPTION_NOT_FOUND when the shop has no subscription', async () => {
    mockEntitlements(null);
    const res = await request(buildApp()).get('/read');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
  });

  it('returns 403 SUBSCRIPTION_SUSPENDED for a suspended shop', async () => {
    mockEntitlements(buildEntitlements({ status: 'suspended' }));
    const res = await request(buildApp()).get('/read');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUBSCRIPTION_SUSPENDED');
  });

  it('allows GET during grace period', async () => {
    mockEntitlements(buildEntitlements({ status: 'grace' }));
    const res = await request(buildApp()).get('/read');
    expect(res.status).toBe(200);
  });

  it('blocks POST during grace period with SUBSCRIPTION_GRACE_READ_ONLY', async () => {
    mockEntitlements(buildEntitlements({ status: 'grace' }));
    const res = await request(buildApp()).post('/write').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUBSCRIPTION_GRACE_READ_ONLY');
  });

  it('allows both reads and writes on active subscription', async () => {
    mockEntitlements(buildEntitlements({ status: 'active' }));
    const readRes = await request(buildApp()).get('/read');
    const writeRes = await request(buildApp()).post('/write').send({});
    expect(readRes.status).toBe(200);
    expect(writeRes.status).toBe(200);
  });

  it('allows both reads and writes on trial subscription', async () => {
    mockEntitlements(buildEntitlements({ status: 'trial' }));
    const readRes = await request(buildApp()).get('/read');
    const writeRes = await request(buildApp()).post('/write').send({});
    expect(readRes.status).toBe(200);
    expect(writeRes.status).toBe(200);
  });
});

describe('requireModule', () => {
  it('blocks a module not in effectiveModules with MODULE_NOT_ENABLED', async () => {
    mockEntitlements(buildEntitlements({ effectiveModules: ['sales'] }));
    const res = await request(buildApp()).get('/disabled-module');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MODULE_NOT_ENABLED');
    expect(res.body.error.details.module).toBe('purchases');
  });

  it('allows a module that is in effectiveModules', async () => {
    mockEntitlements(buildEntitlements({ effectiveModules: ['sales', 'purchases'] }));
    const res = await request(buildApp()).get('/disabled-module');
    expect(res.status).toBe(200);
  });
});
