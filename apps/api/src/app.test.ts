import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import type { Config } from './lib/config.js';

const testConfig: Config = {
  NODE_ENV: 'test',
  PORT: 0,
  MONGODB_URI: 'mongodb://placeholder',
  CORS_ORIGINS: '',
  LOG_LEVEL: 'fatal',
  corsOrigins: [],
};

describe('app', () => {
  const app = createApp(testConfig);

  it('serves /health with liveness metadata', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.uptimeSec).toBe('number');
    expect(res.body.db).toBe(false);
  });

  it('returns the standard 404 envelope for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('assigns a request id and echoes it in the response header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toMatch(/[0-9a-f-]{36}/);
  });

  it('honours a caller-supplied x-request-id', async () => {
    const res = await request(app)
      .get('/health')
      .set('x-request-id', 'caller-supplied-id-123');
    expect(res.headers['x-request-id']).toBe('caller-supplied-id-123');
  });

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
