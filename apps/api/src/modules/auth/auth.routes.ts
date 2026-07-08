import { Router, type Request, type Response } from 'express';
import { loginSchema } from '@shop/shared';
import type { Config } from '../../lib/config.js';
import {
  ACCESS_COOKIE_NAMES,
  REFRESH_COOKIE_NAMES,
  requireAuth,
} from '../../lib/auth.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { validateBody } from '../../middleware/validate.js';
import { loginRateLimiter, refreshRateLimiter } from '../../middleware/rateLimit.js';
import * as authService from './auth.service.js';
import type { Audience } from './auth.tokens.js';

type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  path: string;
  expires: Date;
  signed: false;
};

const cookieOptions = (
  config: Config,
  expires: Date,
  path: string,
): CookieOptions => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict',
  path,
  expires,
  signed: false,
});

const readRefreshCookie = (req: Request, audience: Audience): string | undefined => {
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  const name = REFRESH_COOKIE_NAMES[audience];
  const fromCookie = cookies[name];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) return fromCookie;
  const body = (req.body ?? {}) as { refreshToken?: unknown };
  return typeof body.refreshToken === 'string' ? body.refreshToken : undefined;
};

const applyLoginCookies = (
  res: Response,
  audience: Audience,
  config: Config,
  result: authService.LoginResult,
): void => {
  res.cookie(
    ACCESS_COOKIE_NAMES[audience],
    result.accessToken,
    cookieOptions(config, result.accessExpiresAt, '/'),
  );
  res.cookie(
    REFRESH_COOKIE_NAMES[audience],
    result.refreshToken,
    cookieOptions(
      config,
      result.refreshExpiresAt,
      audience === 'shop' ? '/api/v1/auth' : '/api/admin/v1/auth',
    ),
  );
};

const clearAuthCookies = (
  res: Response,
  audience: Audience,
  config: Config,
): void => {
  const past = new Date(0);
  res.cookie(
    ACCESS_COOKIE_NAMES[audience],
    '',
    cookieOptions(config, past, '/'),
  );
  res.cookie(
    REFRESH_COOKIE_NAMES[audience],
    '',
    cookieOptions(
      config,
      past,
      audience === 'shop' ? '/api/v1/auth' : '/api/admin/v1/auth',
    ),
  );
};

const authConfigFrom = (config: Config): authService.AuthConfig => ({
  accessSecret: config.JWT_SECRET,
  accessTtlMinutes: config.ACCESS_TOKEN_TTL_MINUTES,
  refreshTtlDays: config.REFRESH_TOKEN_TTL_DAYS,
});

export const createAuthRouter = (audience: Audience, config: Config): Router => {
  const router = Router();
  const authCfg = authConfigFrom(config);
  const rateLimitDisabled = config.NODE_ENV === 'test';

  router.post(
    '/login',
    loginRateLimiter({ disabled: rateLimitDisabled }),
    validateBody(loginSchema),
    async (req, res) => {
      const { email, password } = req.body;
      const result = await authService.login(audience, email, password, authCfg);
      applyLoginCookies(res, audience, config, result);
      res.status(200).json({
        user: result.user,
        accessExpiresAt: result.accessExpiresAt.toISOString(),
      });
    },
  );

  router.post('/refresh', refreshRateLimiter({ disabled: rateLimitDisabled }), async (req, res) => {
    const token = readRefreshCookie(req, audience);
    if (token === undefined) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 401, 'Missing refresh token');
    }
    const result = await authService.refresh(audience, token, authCfg);
    applyLoginCookies(res, audience, config, result);
    res.status(200).json({
      user: result.user,
      accessExpiresAt: result.accessExpiresAt.toISOString(),
    });
  });

  router.post('/logout', async (req, res) => {
    const token = readRefreshCookie(req, audience);
    if (token !== undefined) {
      await authService.logout(token, audience);
    }
    clearAuthCookies(res, audience, config);
    res.status(204).send();
  });

  router.get('/me', requireAuth(audience, config.JWT_SECRET), (req, res) => {
    const auth = req.auth;
    if (auth === undefined) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 401, 'Authentication required');
    }
    res.json({
      user: {
        id: auth.userId,
        role: auth.role,
        shopId: auth.shopId,
        audience: auth.audience,
        permissions: auth.permissions,
      },
    });
  });

  return router;
};
