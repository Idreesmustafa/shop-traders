import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    req.log?.warn(
      { code: err.code, details: err.details },
      `AppError: ${err.message}`,
    );
    res.status(err.httpStatus).json(err.toEnvelope());
    return;
  }

  if (err instanceof ZodError) {
    req.log?.warn({ issues: err.issues }, 'validation failed');
    res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: { issues: err.issues },
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  req.log?.error({ err }, `unhandled error: ${message}`);
  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL,
      message: 'Internal server error',
    },
  });
};
