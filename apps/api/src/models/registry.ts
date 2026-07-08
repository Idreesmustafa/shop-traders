import type { Model } from 'mongoose';
import { AuditLogModel } from '../modules/audit/auditLogs.model.js';
import { RefreshTokenModel } from '../modules/auth/refreshTokens.model.js';
import { PlanModel } from '../modules/plans/plans.model.js';
import { PlatformUserModel } from '../modules/platform/platformUsers.model.js';
import { ShopModel } from '../modules/shops/shops.model.js';
import { SubscriptionModel } from '../modules/subscriptions/subscriptions.model.js';
import { UserModel } from '../modules/users/users.model.js';

export const ALL_MODELS: readonly Model<unknown>[] = [
  ShopModel as Model<unknown>,
  UserModel as Model<unknown>,
  PlatformUserModel as Model<unknown>,
  PlanModel as Model<unknown>,
  SubscriptionModel as Model<unknown>,
  AuditLogModel as Model<unknown>,
  RefreshTokenModel as Model<unknown>,
];
