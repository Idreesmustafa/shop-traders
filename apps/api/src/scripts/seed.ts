import argon2 from 'argon2';
import { MODULE_CODES, SHOP_ASSIGNABLE_MODULES } from '@shop/shared';
import { loadConfig } from '../lib/config.js';
import { connectDb, disconnectDb, syncAllIndexes } from '../lib/db.js';
import { createLogger } from '../lib/logger.js';
import { ALL_MODELS } from '../models/registry.js';
import { PlanModel } from '../modules/plans/plans.model.js';
import { PlatformUserModel } from '../modules/platform/platformUsers.model.js';
import { ShopModel } from '../modules/shops/shops.model.js';
import { SubscriptionModel } from '../modules/subscriptions/subscriptions.model.js';
import { UserModel } from '../modules/users/users.model.js';

const requireDevEnvironment = (nodeEnv: string): void => {
  if (nodeEnv === 'production') {
    throw new Error('Refusing to seed against NODE_ENV=production');
  }
};

const hashPassword = (plain: string): Promise<string> =>
  argon2.hash(plain, { type: argon2.argon2id });

const main = async (): Promise<void> => {
  const config = loadConfig();
  requireDevEnvironment(config.NODE_ENV);

  const logger = createLogger(config.LOG_LEVEL);
  const password = process.env['SEED_PASSWORD'] ?? 'changeme!';

  logger.info('connecting to database...');
  await connectDb(config.MONGODB_URI);
  await syncAllIndexes(ALL_MODELS);

  const passwordHash = await hashPassword(password);

  logger.info('upserting platform user (super_admin)...');
  await PlatformUserModel.updateOne(
    { email: 'admin@platform.local' },
    {
      $set: {
        email: 'admin@platform.local',
        name: 'Platform Admin',
        role: 'super_admin',
        passwordHash,
        isActive: true,
      },
    },
    { upsert: true },
  );

  logger.info('upserting starter plan...');
  await PlanModel.updateOne(
    { code: 'starter' },
    {
      $set: {
        code: 'starter',
        name: 'Starter',
        description: 'All modules enabled; suitable for a single-branch shop.',
        modules: [...SHOP_ASSIGNABLE_MODULES],
        limits: { maxUsers: 10 },
        pricePaisa: 0,
        billingCycle: 'monthly',
        trialDays: 30,
        graceDays: 7,
        isActive: true,
      },
    },
    { upsert: true },
  );

  logger.info('upserting demo shop...');
  const shopFilter = { name: 'Demo Shop' };
  await ShopModel.updateOne(
    shopFilter,
    {
      $set: {
        name: 'Demo Shop',
        ownerName: 'Demo Owner',
        phone: '+92 300 0000000',
        email: 'demo@shop.local',
        timezone: 'Asia/Karachi',
        currency: 'PKR',
        pricesIncludeTax: false,
        isActive: true,
      },
    },
    { upsert: true },
  );
  const shop = await ShopModel.findOne(shopFilter).lean();
  if (shop === null) throw new Error('demo shop upsert failed');

  logger.info('upserting shop users (owner, manager, cashier)...');
  for (const [email, name, role] of [
    ['owner@demo.local', 'Owner Ali', 'owner'],
    ['manager@demo.local', 'Manager Bilal', 'manager'],
    ['cashier@demo.local', 'Cashier Chandni', 'cashier'],
  ] as const) {
    await UserModel.updateOne(
      { shopId: shop._id, email },
      {
        $set: {
          shopId: shop._id,
          email,
          name,
          role,
          passwordHash,
          isActive: true,
          isSupportBot: false,
        },
      },
      { upsert: true },
    );
  }

  logger.info('upserting active subscription for demo shop...');
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await SubscriptionModel.updateOne(
    { shopId: shop._id },
    {
      $set: {
        shopId: shop._id,
        planCode: 'starter',
        effectiveModules: [...SHOP_ASSIGNABLE_MODULES],
        status: 'active',
        periodStartAt: now,
        periodEndAt: periodEnd,
        graceDays: 7,
      },
    },
    { upsert: true },
  );

  logger.info(
    { modules: MODULE_CODES.length },
    `seed complete. login with password="${password}"`,
  );

  await disconnectDb();
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
