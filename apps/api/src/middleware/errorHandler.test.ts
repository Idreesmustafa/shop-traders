import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError, ErrorCode } from '../lib/errors.js';
import { errorHandler } from './errorHandler.js';

const buildApp = () => {
  const app = express();
  app.get('/app-error', (_req, _res, next) => {
    next(new AppError(ErrorCode.CONFLICT, 409, 'Conflict!', { key: 'x' }));
  });
  app.get('/zod-error', (_req, _res, next) => {
    const parsed = z.object({ a: z.string() }).safeParse({});
    next(parsed.success ? null : parsed.error);
  });
  app.get('/unknown', () => {
    throw new Error('boom');
  });
  app.use(errorHandler);
  return app;
};

describe('errorHandler', () => {
  it('maps AppError to its envelope with the declared status', async () => {
    const res = await request(buildApp()).get('/app-error');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: 'CONFLICT', message: 'Conflict!', details: { key: 'x' } },
    });
  });

  it('maps ZodError to a 400 VALIDATION_ERROR with issues', async () => {
    const res = await request(buildApp()).get('/zod-error');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details.issues)).toBe(true);
    expect(res.body.error.details.issues.length).toBeGreaterThan(0);
  });

  it('maps unknown errors to a generic 500 without leaking the internal message', async () => {
    const res = await request(buildApp()).get('/unknown');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL', message: 'Internal server error' },
    });
  });
});
