import type { RequestHandler } from 'express';
import type { ModuleCode } from '@shop/shared';
import { AppError } from './errors.js';
import {
  loadShopEntitlements,
  type ShopEntitlements,
} from '../modules/entitlements/entitlements.service.js';

declare module 'express-serve-static-core' {
  interface Request {
    entitlements?: ShopEntitlements;
  }
}

export const EntitlementErrorCode = {
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_SUSPENDED: 'SUBSCRIPTION_SUSPENDED',
  SUBSCRIPTION_GRACE_READ_ONLY: 'SUBSCRIPTION_GRACE_READ_ONLY',
  MODULE_NOT_ENABLED: 'MODULE_NOT_ENABLED',
} as const;

const isReadMethod = (method: string): boolean =>
  method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

/**
 * Loads the shop's subscription onto req.entitlements and enforces status:
 * - missing: 403 SUBSCRIPTION_NOT_FOUND
 * - suspended: 403 SUBSCRIPTION_SUSPENDED
 * - grace: reads OK, writes 403 SUBSCRIPTION_GRACE_READ_ONLY
 * - trial/active: allowed
 */
export const requireSubscription = (): RequestHandler => {
  return async (req, _res, next) => {
    const auth = req.auth;
    if (auth === undefined || auth.shopId === undefined) {
      next(new AppError('UNAUTHORIZED', 401, 'Shop authentication required'));
      return;
    }
    const ent = await loadShopEntitlements(auth.shopId);
    if (ent === null) {
      next(
        new AppError(
          EntitlementErrorCode.SUBSCRIPTION_NOT_FOUND,
          403,
          'This shop has no active subscription',
        ),
      );
      return;
    }
    if (ent.status === 'suspended') {
      next(
        new AppError(
          EntitlementErrorCode.SUBSCRIPTION_SUSPENDED,
          403,
          'Subscription is suspended',
          { renewalRequired: true },
        ),
      );
      return;
    }
    if (ent.status === 'grace' && !isReadMethod(req.method)) {
      next(
        new AppError(
          EntitlementErrorCode.SUBSCRIPTION_GRACE_READ_ONLY,
          403,
          'Subscription is in grace period; only read requests are allowed',
        ),
      );
      return;
    }
    req.entitlements = ent;
    next();
  };
};

export const requireModule = (code: ModuleCode): RequestHandler => {
  return (req, _res, next) => {
    const ent = req.entitlements;
    if (ent === undefined) {
      next(
        new AppError(
          'INTERNAL',
          500,
          'requireModule() called without requireSubscription() upstream',
        ),
      );
      return;
    }
    if (!ent.effectiveModules.includes(code)) {
      next(
        new AppError(
          EntitlementErrorCode.MODULE_NOT_ENABLED,
          403,
          `The '${code}' module is not enabled for this shop`,
          { module: code },
        ),
      );
      return;
    }
    next();
  };
};
