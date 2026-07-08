import { Router } from 'express';
import type { Config } from '../../lib/config.js';
import { requireAuth } from '../../lib/auth.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { loadShopEntitlements } from '../entitlements/entitlements.service.js';

export const createMeRouter = (config: Config): Router => {
  const router = Router();

  router.get('/entitlements', requireAuth('shop', config.JWT_SECRET), async (req, res) => {
    const auth = req.auth;
    if (auth === undefined || auth.shopId === undefined) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 401, 'Shop authentication required');
    }
    const ent = await loadShopEntitlements(auth.shopId);
    res.json({
      user: {
        id: auth.userId,
        role: auth.role,
        shopId: auth.shopId,
        permissions: auth.permissions,
      },
      subscription:
        ent === null
          ? null
          : {
              planCode: ent.planCode,
              status: ent.status,
              effectiveModules: ent.effectiveModules,
              periodStartAt: ent.periodStartAt.toISOString(),
              periodEndAt: ent.periodEndAt.toISOString(),
              graceDays: ent.graceDays,
              graceEndAt: ent.graceEndAt.toISOString(),
            },
    });
  });

  return router;
};
