import type { RequestHandler } from 'express';
import { AppError, ErrorCode } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(ErrorCode.NOT_FOUND, 404, `Route not found: ${req.method} ${req.path}`));
};
