import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useMongo } from '../../test-utils/mongo.js';
import { UserModel } from './users.model.js';

useMongo();

const baseUser = () => ({
  shopId: new mongoose.Types.ObjectId(),
  email: 'a@b.com',
  passwordHash: 'hash',
  name: 'A',
  role: 'owner' as const,
});

describe('UserModel', () => {
  it('creates a shop user with role', async () => {
    const shopId = new mongoose.Types.ObjectId();
    const user = await UserModel.create({ ...baseUser(), shopId, role: 'cashier' });
    expect(user.email).toBe('a@b.com');
    expect(user.role).toBe('cashier');
    expect(user.isActive).toBe(true);
  });

  it('enforces unique email per shop but allows the same email in a different shop', async () => {
    const shopA = new mongoose.Types.ObjectId();
    const shopB = new mongoose.Types.ObjectId();

    await UserModel.create({ ...baseUser(), shopId: shopA, email: 'dup@x.com' });
    await expect(
      UserModel.create({ ...baseUser(), shopId: shopA, email: 'dup@x.com' }),
    ).rejects.toThrow();

    await expect(
      UserModel.create({ ...baseUser(), shopId: shopB, email: 'dup@x.com' }),
    ).resolves.toBeDefined();
  });

  it('rejects an unknown role', async () => {
    await expect(
      UserModel.create({ ...baseUser(), role: 'godmode' as never }),
    ).rejects.toThrow();
  });
});
