import { describe, expect, it } from 'vitest';
import { useMongo } from '../../test-utils/mongo.js';
import { PlatformUserModel } from './platformUsers.model.js';

useMongo();

describe('PlatformUserModel', () => {
  it('creates a platform user with role', async () => {
    const user = await PlatformUserModel.create({
      email: 'admin@platform.local',
      passwordHash: 'hash',
      name: 'Admin',
      role: 'super_admin',
    });
    expect(user.email).toBe('admin@platform.local');
    expect(user.role).toBe('super_admin');
  });

  it('enforces globally unique email', async () => {
    await PlatformUserModel.create({
      email: 'a@x.com',
      passwordHash: 'h',
      name: 'A',
      role: 'support',
    });
    await expect(
      PlatformUserModel.create({
        email: 'a@x.com',
        passwordHash: 'h2',
        name: 'B',
        role: 'support',
      }),
    ).rejects.toThrow();
  });
});
