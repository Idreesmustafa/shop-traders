import type { Config } from '../lib/config.js';

export const buildTestConfig = (overrides: Partial<Config> = {}): Config => ({
  NODE_ENV: 'test',
  PORT: 0,
  MONGODB_URI: 'mongodb://placeholder',
  CORS_ORIGINS: '',
  LOG_LEVEL: 'fatal',
  SYNC_INDEXES: false,
  JWT_SECRET: 'a'.repeat(32),
  COOKIE_SECRET: 'b'.repeat(32),
  ACCESS_TOKEN_TTL_MINUTES: 15,
  REFRESH_TOKEN_TTL_DAYS: 30,
  corsOrigins: [],
  ...overrides,
});
