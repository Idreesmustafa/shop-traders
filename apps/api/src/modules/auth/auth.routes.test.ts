import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { useMongo } from '../../test-utils/mongo.js';
import { buildTestConfig } from '../../test-utils/testConfig.js';
import { PlatformUserModel } from '../platform/platformUsers.model.js';
import { ShopModel } from '../shops/shops.model.js';
import { UserModel } from '../users/users.model.js';
import { hashPassword } from './auth.service.js';
import { RefreshTokenModel } from './refreshTokens.model.js';

useMongo();

const config = buildTestConfig();
const app = createApp(config);

const seedShopOwner = async (): Promise<{ shopId: mongoose.Types.ObjectId }> => {
  const shop = await ShopModel.create({
    name: 'Test Shop',
    ownerName: 'Owner',
    phone: '+92 300 0000000',
  });
  const passwordHash = await hashPassword('password123');
  await UserModel.create({
    shopId: shop._id,
    email: 'owner@test.local',
    passwordHash,
    name: 'Owner',
    role: 'owner',
  });
  return { shopId: shop._id };
};

const seedPlatformAdmin = async (): Promise<void> => {
  const passwordHash = await hashPassword('platform123');
  await PlatformUserModel.create({
    email: 'admin@platform.local',
    passwordHash,
    name: 'Platform Admin',
    role: 'super_admin',
  });
};

const cookiesByName = (res: request.Response): Record<string, string> => {
  const map: Record<string, string> = {};
  const setCookie = res.headers['set-cookie'];
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const entry of list) {
    const [pair] = entry.split(';');
    if (pair === undefined) continue;
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    map[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return map;
};

describe('POST /api/v1/auth/login', () => {
  it('accepts valid credentials, sets httpOnly cookies, returns the user', async () => {
    await seedShopOwner();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@test.local', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('owner@test.local');
    expect(res.body.user.role).toBe('owner');
    expect(res.body.user.shopId).toBeDefined();
    const cookies = cookiesByName(res);
    expect(cookies['at']).toBeTruthy();
    expect(cookies['rt']).toBeTruthy();

    const setCookieHeader = res.headers['set-cookie'];
    const raw = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : String(setCookieHeader);
    expect(raw.toLowerCase()).toContain('httponly');
    expect(raw.toLowerCase()).toContain('samesite=strict');
  });

  it('returns 401 with the same message for wrong password and unknown email', async () => {
    await seedShopOwner();
    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@test.local', password: 'wrong' });
    const missing = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.local', password: 'password123' });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body.error.message).toBe(missing.body.error.message);
  });

  it('validates the body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('separates shop and admin token audiences', async () => {
    await seedShopOwner();
    await seedPlatformAdmin();

    const shopLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@test.local', password: 'password123' });
    const shopAccess = cookiesByName(shopLogin)['at'];

    const adminLogin = await request(app)
      .post('/api/admin/v1/auth/login')
      .send({ email: 'admin@platform.local', password: 'platform123' });
    expect(adminLogin.status).toBe(200);
    const adminAccess = cookiesByName(adminLogin)['at_admin'];

    // Shop token cannot access admin /me
    const crossed = await request(app)
      .get('/api/admin/v1/auth/me')
      .set('Cookie', `at_admin=${shopAccess}`);
    expect(crossed.status).toBe(401);

    // Admin token cannot access shop /me
    const other = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', `at=${adminAccess}`);
    expect(other.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the user, role, shopId, and permissions with a valid cookie', async () => {
    await seedShopOwner();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@test.local', password: 'password123' });
    const at = cookiesByName(login)['at'];
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', `at=${at}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('owner');
    expect(res.body.user.permissions).toContain('sales.create');
    expect(res.body.user.permissions).toContain('reports.viewProfit');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    await seedShopOwner();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@test.local', password: 'password123' });
    const rt = cookiesByName(login)['rt'];

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `rt=${rt}`);
    expect(refreshRes.status).toBe(200);
    const newRt = cookiesByName(refreshRes)['rt'];
    expect(newRt).toBeTruthy();
    expect(newRt).not.toBe(rt);
  });

  it('invalidates the token chain when a rotated token is reused', async () => {
    await seedShopOwner();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@test.local', password: 'password123' });
    const rt = cookiesByName(login)['rt'];

    const first = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `rt=${rt}`);
    expect(first.status).toBe(200);

    // Replay the old refresh token — must fail AND revoke the new one
    const replay = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `rt=${rt}`);
    expect(replay.status).toBe(401);
    expect(replay.body.error.message).toMatch(/replay/i);

    const activeCount = await RefreshTokenModel.countDocuments({ revokedAt: null });
    expect(activeCount).toBe(0);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('revokes the refresh token and clears cookies', async () => {
    await seedShopOwner();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@test.local', password: 'password123' });
    const rt = cookiesByName(login)['rt'];

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `rt=${rt}`);
    expect(res.status).toBe(204);
    const activeCount = await RefreshTokenModel.countDocuments({ revokedAt: null });
    expect(activeCount).toBe(0);
  });
});
