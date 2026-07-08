import { Router } from 'express';
import type { Config } from '../../lib/config.js';
import {
  requireAuth,
  requirePermission,
} from '../../lib/auth.js';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { validateBody } from '../../middleware/validate.js';
import {
  assignPlanSchema,
  createShopSchema,
  paginationSchema,
  setModulesSchema,
  updateShopSchema,
} from './admin.schemas.js';
import * as adminShops from './adminShops.service.js';
import { impersonateShop } from './adminImpersonate.service.js';
import type { AuditActorRef } from '../audit/audit.service.js';

const actorFromReq = (
  req: import('express').Request,
): AuditActorRef => {
  const auth = req.auth;
  if (auth === undefined || auth.audience !== 'admin') {
    throw new AppError(ErrorCode.UNAUTHORIZED, 401, 'Admin authentication required');
  }
  return { type: 'platform_user', id: auth.userId, email: '' };
};

export const createAdminRouter = (config: Config): Router => {
  const router = Router();
  const auth = requireAuth('admin', config.JWT_SECRET);

  router.get(
    '/shops',
    auth,
    requirePermission('platform.shops.read'),
    async (req, res) => {
      const q = paginationSchema.parse(req.query);
      res.json(await adminShops.listShops(q.page, q.limit));
    },
  );

  router.post(
    '/shops',
    auth,
    requirePermission('platform.shops.write'),
    validateBody(createShopSchema),
    async (req, res) => {
      const result = await adminShops.createShopWithOwner(req.body, actorFromReq(req));
      res.status(201).json(result);
    },
  );

  router.get(
    '/shops/:id',
    auth,
    requirePermission('platform.shops.read'),
    async (req, res) => {
      const id = req.params['id'];
      if (typeof id !== 'string') {
        throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
      }
      res.json(await adminShops.getShopById(id));
    },
  );

  router.patch(
    '/shops/:id',
    auth,
    requirePermission('platform.shops.write'),
    validateBody(updateShopSchema),
    async (req, res) => {
      const id = req.params['id'];
      if (typeof id !== 'string') {
        throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
      }
      res.json(await adminShops.updateShop(id, req.body, actorFromReq(req)));
    },
  );

  router.post(
    '/shops/:id/plan',
    auth,
    requirePermission('platform.subscriptions.write'),
    validateBody(assignPlanSchema),
    async (req, res) => {
      const id = req.params['id'];
      if (typeof id !== 'string') {
        throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
      }
      res.json(await adminShops.assignPlan(id, req.body, actorFromReq(req)));
    },
  );

  router.patch(
    '/shops/:id/modules',
    auth,
    requirePermission('platform.subscriptions.write'),
    validateBody(setModulesSchema),
    async (req, res) => {
      const id = req.params['id'];
      if (typeof id !== 'string') {
        throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
      }
      res.json(await adminShops.setEffectiveModules(id, req.body, actorFromReq(req)));
    },
  );

  router.post(
    '/shops/:id/impersonate',
    auth,
    requirePermission('platform.impersonate'),
    async (req, res) => {
      const id = req.params['id'];
      if (typeof id !== 'string') {
        throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
      }
      const result = await impersonateShop(id, actorFromReq(req), {
        accessSecret: config.JWT_SECRET,
        accessTtlMinutes: config.ACCESS_TOKEN_TTL_MINUTES,
        refreshTtlDays: config.REFRESH_TOKEN_TTL_DAYS,
      });
      res.status(201).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accessExpiresAt: result.accessExpiresAt.toISOString(),
        refreshExpiresAt: result.refreshExpiresAt.toISOString(),
        botUserId: result.botUserId,
      });
    },
  );

  router.get(
    '/plans',
    auth,
    requirePermission('platform.plans.read'),
    async (_req, res) => {
      res.json(await adminShops.listPlans());
    },
  );

  return router;
};
