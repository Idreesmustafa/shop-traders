import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

const oneMinute = 60 * 1000;

export type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  disabled?: boolean;
};

export const loginRateLimiter = (opts: RateLimitOptions = {}): RateLimitRequestHandler =>
  rateLimit({
    windowMs: opts.windowMs ?? oneMinute,
    limit: opts.limit ?? 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => opts.disabled === true,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts, please try again shortly.',
      },
    },
  });

export const refreshRateLimiter = (opts: RateLimitOptions = {}): RateLimitRequestHandler =>
  rateLimit({
    windowMs: opts.windowMs ?? oneMinute,
    limit: opts.limit ?? 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => opts.disabled === true,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many refresh attempts, please try again shortly.',
      },
    },
  });
