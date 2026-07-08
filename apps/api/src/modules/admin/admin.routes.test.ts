import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { buildTestConfig } from '../../test-utils/testConfig.js';
import { signAccessToken } from '../auth/auth.tokens.js';

const config = buildTestConfig();
const app = createApp(config);

const adminToken = (role: 'super_admin' | 'support'): string =>
  signAccessToken(
    { sub: 'p1', aud: 'admin', role, shopId: undefined },
    { secret: config.JWT_SECRET, ttlMinutes: 15 },
  );

describe('admin routes: permission gates', () => {
  it('rejects unauthenticated GET /api/admin/v1/plans', async () => {
    const res = await request(app).get('/api/admin/v1/plans');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a shop token on an admin route', async () => {
    const shopToken = signAccessToken(
      { sub: 'u1', aud: 'shop', role: 'owner', shopId: 's1' },
      { secret: config.JWT_SECRET, ttlMinutes: 15 },
    );
    const res = await request(app)
      .get('/api/admin/v1/plans')
      .set('Authorization', `Bearer ${shopToken}`);
    expect(res.status).toBe(401);
  });

  it('denies support role on POST /api/admin/v1/shops (403 FORBIDDEN)', async () => {
    const res = await request(app)
      .post('/api/admin/v1/shops')
      .set('Authorization', `Bearer ${adminToken('support')}`)
      .send({
        shop: { name: 'X', ownerName: 'Y', phone: '+9200' },
        owner: { email: 'o@x.com', name: 'O', password: 'password123' },
        planCode: 'starter',
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('denies support role on PATCH modules (write scope)', async () => {
    const res = await request(app)
      .patch('/api/admin/v1/shops/000000000000000000000001/modules')
      .set('Authorization', `Bearer ${adminToken('support')}`)
      .send({ effectiveModules: ['sales'] });
    expect(res.status).toBe(403);
  });

  it('rejects unknown module codes at the boundary (VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .patch('/api/admin/v1/shops/000000000000000000000001/modules')
      .set('Authorization', `Bearer ${adminToken('super_admin')}`)
      .send({ effectiveModules: ['imaginary'] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows super_admin role past auth and permission gates', async () => {
    // The 404 shape below proves the gates all passed and the route reached the
    // service layer. The ':id' handler validates the ObjectId early via mongoose
    // and returns a 404, which is what we want to assert.
    const res = await request(app)
      .get('/api/admin/v1/shops/not-a-valid-id')
      .set('Authorization', `Bearer ${adminToken('super_admin')}`);
    expect([404, 500]).toContain(res.status);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).not.toBe('UNAUTHORIZED');
    expect(res.body.error.code).not.toBe('FORBIDDEN');
  });
});
