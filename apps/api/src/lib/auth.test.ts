import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../middleware/errorHandler.js';
import { signAccessToken } from '../modules/auth/auth.tokens.js';
import { requireAuth, requirePermission } from './auth.js';

const SECRET = 'x'.repeat(32);

const buildApp = () => {
  const app = express();
  app.get('/shop', requireAuth('shop', SECRET), requirePermission('sales.create'), (req, res) => {
    res.json({ userId: req.auth?.userId });
  });
  app.get('/admin', requireAuth('admin', SECRET), (req, res) => {
    res.json({ userId: req.auth?.userId });
  });
  app.use(errorHandler);
  return app;
};

const shopToken = (role: string): string =>
  signAccessToken(
    { sub: 'u1', aud: 'shop', role, shopId: 's1' },
    { secret: SECRET, ttlMinutes: 15 },
  );

describe('requireAuth', () => {
  it('rejects without a token', async () => {
    const res = await request(buildApp()).get('/shop');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed token', async () => {
    const res = await request(buildApp())
      .get('/shop')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('rejects a shop token on an admin route', async () => {
    const res = await request(buildApp())
      .get('/admin')
      .set('Authorization', `Bearer ${shopToken('owner')}`);
    expect(res.status).toBe(401);
  });

  it('accepts a valid shop token via Authorization header', async () => {
    const res = await request(buildApp())
      .get('/shop')
      .set('Authorization', `Bearer ${shopToken('owner')}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('u1');
  });
});

describe('requirePermission', () => {
  it('allows owner on sales.create', async () => {
    const res = await request(buildApp())
      .get('/shop')
      .set('Authorization', `Bearer ${shopToken('owner')}`);
    expect(res.status).toBe(200);
  });

  it('allows cashier on sales.create', async () => {
    const res = await request(buildApp())
      .get('/shop')
      .set('Authorization', `Bearer ${shopToken('cashier')}`);
    expect(res.status).toBe(200);
  });

  it('denies cashier on owner-only routes', async () => {
    const app = express();
    app.get(
      '/costs',
      requireAuth('shop', SECRET),
      requirePermission('products.viewCost'),
      (_req, res) => res.json({ ok: true }),
    );
    app.use(errorHandler);

    const res = await request(app)
      .get('/costs')
      .set('Authorization', `Bearer ${shopToken('cashier')}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
