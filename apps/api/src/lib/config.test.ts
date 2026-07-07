import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('parses a complete valid environment', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '4000',
      MONGODB_URI: 'mongodb://db:27017/app',
      CORS_ORIGINS: 'https://a.example, https://b.example',
      LOG_LEVEL: 'warn',
    });
    expect(config.NODE_ENV).toBe('production');
    expect(config.PORT).toBe(4000);
    expect(config.MONGODB_URI).toBe('mongodb://db:27017/app');
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.LOG_LEVEL).toBe('warn');
  });

  it('applies defaults for optional values', () => {
    const config = loadConfig({ MONGODB_URI: 'mongodb://localhost/test' });
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.corsOrigins).toEqual([]);
  });

  it('throws with a specific message when MONGODB_URI is missing', () => {
    expect(() => loadConfig({})).toThrowError(/MONGODB_URI/);
  });

  it('throws when PORT is not a positive integer', () => {
    expect(() =>
      loadConfig({ MONGODB_URI: 'mongodb://x', PORT: '-5' }),
    ).toThrowError(/PORT/);
  });

  it('throws when LOG_LEVEL is unknown', () => {
    expect(() =>
      loadConfig({ MONGODB_URI: 'mongodb://x', LOG_LEVEL: 'chatty' }),
    ).toThrowError(/LOG_LEVEL/);
  });
});
