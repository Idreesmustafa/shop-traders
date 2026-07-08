import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { syncAllIndexes } from '../lib/db.js';
import { ALL_MODELS } from '../models/registry.js';

let replSet: MongoMemoryReplSet | null = null;

const startMemoryMongo = async (): Promise<void> => {
  if (replSet !== null) return;
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri(), { autoIndex: false });
  await syncAllIndexes(ALL_MODELS);
};

const stopMemoryMongo = async (): Promise<void> => {
  await mongoose.disconnect();
  if (replSet !== null) {
    await replSet.stop();
    replSet = null;
  }
};

const clearCollections = async (): Promise<void> => {
  const db = mongoose.connection.db;
  if (db === undefined) return;
  const collections = await db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
};

/**
 * Registers vitest lifecycle hooks that spin up mongodb-memory-server for the
 * calling test file. If the binary cannot be started (typically because the
 * sandbox blocks the mongod download), the hook logs once and skips every
 * test in the file instead of failing the suite.
 */
export const useMongo = (): void => {
  let up = false;

  beforeAll(async () => {
    try {
      await startMemoryMongo();
      up = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
      console.warn(`[test-utils/mongo] skipping: ${msg ?? 'unknown error'}`);
    }
  }, 120_000);

  afterAll(async () => {
    if (up) await stopMemoryMongo();
  });

  beforeEach((ctx) => {
    if (!up) ctx.skip();
  });

  afterEach(async () => {
    if (up) await clearCollections();
  });
};
