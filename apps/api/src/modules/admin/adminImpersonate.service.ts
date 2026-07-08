import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { SHOP_ROLE_PERMISSIONS } from '@shop/shared';
import { AppError } from '../../lib/errors.js';
import { hashPassword } from '../auth/auth.service.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  type AccessTokenConfig,
} from '../auth/auth.tokens.js';
import { RefreshTokenModel } from '../auth/refreshTokens.model.js';
import { ShopModel } from '../shops/shops.model.js';
import { UserModel } from '../users/users.model.js';
import { writeAudit, type AuditActorRef } from '../audit/audit.service.js';

export type ImpersonateConfig = {
  accessSecret: string;
  accessTtlMinutes: number;
  refreshTtlDays: number;
};

const SUPPORT_BOT_EMAIL = 'support-bot@platform.local';

const findOrCreateSupportBot = async (
  shopId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession,
): Promise<{ userId: mongoose.Types.ObjectId; created: boolean }> => {
  const existing = await UserModel.findOne({
    shopId,
    email: SUPPORT_BOT_EMAIL,
  }).session(session);
  if (existing !== null) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save({ session });
    }
    return { userId: existing._id, created: false };
  }
  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
  const [created] = await UserModel.create(
    [
      {
        shopId,
        email: SUPPORT_BOT_EMAIL,
        passwordHash,
        name: 'Support Bot',
        role: 'owner',
        isActive: true,
        isSupportBot: true,
      },
    ],
    { session },
  );
  if (created === undefined) throw new Error('failed to create support bot');
  return { userId: created._id, created: true };
};

export const impersonateShop = async (
  shopId: string,
  actor: AuditActorRef,
  config: ImpersonateConfig,
): Promise<{
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  botUserId: string;
}> => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');
  }
  const shop = await ShopModel.findById(shopId);
  if (shop === null) throw new AppError('SHOP_NOT_FOUND', 404, 'Shop not found');

  const session = await mongoose.startSession();
  try {
    let outcome: {
      accessToken: string;
      refreshToken: string;
      accessExpiresAt: Date;
      refreshExpiresAt: Date;
      botUserId: string;
    } | null = null;

    await session.withTransaction(async () => {
      const { userId, created } = await findOrCreateSupportBot(shop._id, session);
      const nowDate = new Date();

      const tokenConfig: AccessTokenConfig = {
        secret: config.accessSecret,
        ttlMinutes: config.accessTtlMinutes,
      };
      const accessToken = signAccessToken(
        {
          sub: userId.toString(),
          aud: 'shop',
          role: 'owner',
          shopId: shop._id.toString(),
        },
        tokenConfig,
      );
      const accessExpiresAt = new Date(
        nowDate.getTime() + config.accessTtlMinutes * 60_000,
      );

      const refreshToken = generateRefreshToken();
      const refreshExpiresAt = new Date(
        nowDate.getTime() + config.refreshTtlDays * 24 * 60 * 60_000,
      );

      await RefreshTokenModel.create(
        [
          {
            userId,
            audience: 'shop',
            shopId: shop._id,
            tokenHash: hashRefreshToken(refreshToken),
            expiresAt: refreshExpiresAt,
          },
        ],
        { session },
      );

      await writeAudit(
        {
          actor,
          action: 'shop.impersonate',
          resourceType: 'shop',
          resourceId: shop._id,
          shopId: shop._id,
          metadata: {
            botUserId: userId.toString(),
            botCreated: created,
            permissions: SHOP_ROLE_PERMISSIONS.owner,
          },
        },
        session,
      );

      outcome = {
        accessToken,
        refreshToken,
        accessExpiresAt,
        refreshExpiresAt,
        botUserId: userId.toString(),
      };
    });

    if (outcome === null) throw new Error('impersonation transaction produced no output');
    return outcome;
  } finally {
    session.endSession();
  }
};
