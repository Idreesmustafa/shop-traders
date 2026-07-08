import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { useMongo } from '../../test-utils/mongo.js';
import { AuditLogModel } from './auditLogs.model.js';

useMongo();

describe('AuditLogModel', () => {
  it('records an admin action against a shop', async () => {
    const entry = await AuditLogModel.create({
      actorType: 'platform_user',
      actorId: new mongoose.Types.ObjectId(),
      actorEmail: 'admin@platform.local',
      action: 'shop.create',
      resourceType: 'shop',
      resourceId: new mongoose.Types.ObjectId(),
      shopId: new mongoose.Types.ObjectId(),
      after: { name: 'Demo Shop' },
    });
    expect(entry.action).toBe('shop.create');
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it('rejects an unknown actorType', async () => {
    await expect(
      AuditLogModel.create({
        actorType: 'stranger' as never,
        action: 'x',
        resourceType: 'y',
      }),
    ).rejects.toThrow();
  });

  it('has no updatedAt field on the schema (audit is append-only)', async () => {
    const entry = await AuditLogModel.create({
      actorType: 'system',
      action: 'boot',
      resourceType: 'server',
    });
    const raw = entry.toObject() as Record<string, unknown>;
    expect(raw['updatedAt']).toBeUndefined();
  });
});
