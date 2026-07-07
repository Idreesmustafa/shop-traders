import { describe, expect, it } from 'vitest';
import { AppError, ErrorCode } from './errors.js';

describe('AppError', () => {
  it('carries code, status, message, details', () => {
    const err = new AppError(ErrorCode.CONFLICT, 409, 'Duplicate', { field: 'code' });
    expect(err.code).toBe('CONFLICT');
    expect(err.httpStatus).toBe(409);
    expect(err.message).toBe('Duplicate');
    expect(err.details).toEqual({ field: 'code' });
  });

  it('serialises to the standard envelope with details', () => {
    const err = new AppError(ErrorCode.VALIDATION_ERROR, 400, 'Bad', { path: 'a.b' });
    expect(err.toEnvelope()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bad',
        details: { path: 'a.b' },
      },
    });
  });

  it('omits details from the envelope when not provided', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 404, 'Missing');
    expect(err.toEnvelope()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Missing' },
    });
  });
});
