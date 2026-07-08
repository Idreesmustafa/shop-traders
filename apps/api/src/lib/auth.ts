import type { RequestHandler } from 'express';
import { hasPermission, type Permission } from '@shop/shared';
import { AppError, ErrorCode } from './errors.js';
import {
  verifyAccessToken,
  type AccessClaims,
  type Audience,
} from '../modules/auth/auth.tokens.js';
import { SHOP_ROLE_PERMISSIONS, PLATFORM_ROLE_PERMISSIONS } from '@shop/shared';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export type AuthContext = {
  userId: string;
  role: string;
  shopId: string | undefined;
  audience: Audience;
  permissions: readonly Permission[];
};

const extractToken = (
  headerValue: string | string[] | undefined,
  cookie: string | undefined,
): string | null => {
  if (typeof headerValue === 'string') {
    const [scheme, rest] = headerValue.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && typeof rest === 'string' && rest.length > 0) {
      return rest;
    }
  }
  if (typeof cookie === 'string' && cookie.length > 0) return cookie;
  return null;
};

const permissionsFor = (audience: Audience, role: string): readonly Permission[] => {
  if (audience === 'shop') {
    return (
      SHOP_ROLE_PERMISSIONS[role as keyof typeof SHOP_ROLE_PERMISSIONS] ?? []
    );
  }
  return (
    PLATFORM_ROLE_PERMISSIONS[role as keyof typeof PLATFORM_ROLE_PERMISSIONS] ?? []
  );
};

const cookieName = (audience: Audience): string =>
  audience === 'shop' ? 'at' : 'at_admin';

export const requireAuth = (audience: Audience, secret: string): RequestHandler => {
  return (req, _res, next) => {
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    const token = extractToken(req.headers.authorization, cookies[cookieName(audience)]);
    if (token === null) {
      next(new AppError(ErrorCode.UNAUTHORIZED, 401, 'Authentication required'));
      return;
    }
    let claims: AccessClaims;
    try {
      claims = verifyAccessToken(token, audience, secret);
    } catch {
      next(new AppError(ErrorCode.UNAUTHORIZED, 401, 'Invalid or expired token'));
      return;
    }
    if (audience === 'shop' && claims.shopId === undefined) {
      next(new AppError(ErrorCode.UNAUTHORIZED, 401, 'Shop token missing shopId'));
      return;
    }
    req.auth = {
      userId: claims.sub,
      role: claims.role,
      shopId: claims.shopId,
      audience,
      permissions: permissionsFor(audience, claims.role),
    };
    next();
  };
};

export const requirePermission = (permission: Permission): RequestHandler => {
  return (req, _res, next) => {
    const auth = req.auth;
    if (auth === undefined) {
      next(new AppError(ErrorCode.UNAUTHORIZED, 401, 'Authentication required'));
      return;
    }
    if (!hasPermission(auth.permissions, permission)) {
      next(
        new AppError(ErrorCode.FORBIDDEN, 403, `Missing permission: ${permission}`),
      );
      return;
    }
    next();
  };
};

export const ACCESS_COOKIE_NAMES = { shop: 'at', admin: 'at_admin' } as const;
export const REFRESH_COOKIE_NAMES = { shop: 'rt', admin: 'rt_admin' } as const;
