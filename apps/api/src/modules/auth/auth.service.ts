import mongoose from 'mongoose';
import argon2 from 'argon2';
import {
  PLATFORM_ROLE_PERMISSIONS,
  SHOP_ROLE_PERMISSIONS,
  isPlatformRole,
  isShopRole,
  type Permission,
} from '@shop/shared';
import { AppError, ErrorCode } from '../../lib/errors.js';
import { PlatformUserModel } from '../platform/platformUsers.model.js';
import { UserModel } from '../users/users.model.js';
import { RefreshTokenModel } from './refreshTokens.model.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  type AccessTokenConfig,
  type Audience,
} from './auth.tokens.js';

export type AuthConfig = {
  accessSecret: string;
  accessTtlMinutes: number;
  refreshTtlDays: number;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  shopId: string | undefined;
  permissions: readonly Permission[];
};

export type LoginResult = {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

export const hashPassword = (plain: string): Promise<string> =>
  argon2.hash(plain, { type: argon2.argon2id });

export const verifyPassword = (hash: string, plain: string): Promise<boolean> =>
  argon2.verify(hash, plain);

const invalidCredentials = () =>
  new AppError(ErrorCode.UNAUTHORIZED, 401, 'Invalid email or password');

const loadShopUser = async (
  userId: mongoose.Types.ObjectId,
): Promise<AuthenticatedUser | null> => {
  const u = await UserModel.findById(userId);
  if (u === null || !u.isActive) return null;
  if (!isShopRole(u.role)) return null;
  return {
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    role: u.role,
    shopId: u.shopId.toString(),
    permissions: SHOP_ROLE_PERMISSIONS[u.role],
  };
};

const loadPlatformUser = async (
  userId: mongoose.Types.ObjectId,
): Promise<AuthenticatedUser | null> => {
  const u = await PlatformUserModel.findById(userId);
  if (u === null || !u.isActive) return null;
  if (!isPlatformRole(u.role)) return null;
  return {
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    role: u.role,
    shopId: undefined,
    permissions: PLATFORM_ROLE_PERMISSIONS[u.role],
  };
};

const issueTokens = async (
  audience: Audience,
  user: AuthenticatedUser,
  config: AuthConfig,
  now: Date,
): Promise<LoginResult> => {
  const accessConfig: AccessTokenConfig = {
    secret: config.accessSecret,
    ttlMinutes: config.accessTtlMinutes,
  };
  const accessToken = signAccessToken(
    { sub: user.id, aud: audience, role: user.role, shopId: user.shopId },
    accessConfig,
  );
  const accessExpiresAt = new Date(now.getTime() + config.accessTtlMinutes * 60_000);

  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(
    now.getTime() + config.refreshTtlDays * 24 * 60 * 60_000,
  );

  await RefreshTokenModel.create({
    userId: new mongoose.Types.ObjectId(user.id),
    audience,
    shopId:
      user.shopId !== undefined ? new mongoose.Types.ObjectId(user.shopId) : undefined,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshExpiresAt,
  });

  return { user, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt };
};

export const login = async (
  audience: Audience,
  email: string,
  password: string,
  config: AuthConfig,
): Promise<LoginResult> => {
  const now = new Date();
  const normalisedEmail = email.toLowerCase();

  if (audience === 'shop') {
    const user = await UserModel.findOne({ email: normalisedEmail, isActive: true });
    if (user === null) throw invalidCredentials();
    if (!(await verifyPassword(user.passwordHash, password))) throw invalidCredentials();
    const authed = await loadShopUser(user._id);
    if (authed === null) throw invalidCredentials();
    await UserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: now } });
    return issueTokens(audience, authed, config, now);
  }

  const user = await PlatformUserModel.findOne({
    email: normalisedEmail,
    isActive: true,
  });
  if (user === null) throw invalidCredentials();
  if (!(await verifyPassword(user.passwordHash, password))) throw invalidCredentials();
  const authed = await loadPlatformUser(user._id);
  if (authed === null) throw invalidCredentials();
  await PlatformUserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: now } });
  return issueTokens(audience, authed, config, now);
};

export const refresh = async (
  audience: Audience,
  rawToken: string,
  config: AuthConfig,
): Promise<LoginResult> => {
  const now = new Date();
  const tokenHash = hashRefreshToken(rawToken);
  const stored = await RefreshTokenModel.findOne({ tokenHash });
  if (stored === null || stored.audience !== audience) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 401, 'Invalid refresh token');
  }
  if (stored.revokedAt !== undefined && stored.revokedAt !== null) {
    await RefreshTokenModel.updateMany(
      { userId: stored.userId, audience, revokedAt: null },
      { $set: { revokedAt: now } },
    );
    throw new AppError(ErrorCode.UNAUTHORIZED, 401, 'Refresh token replay detected');
  }
  if (stored.expiresAt <= now) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 401, 'Refresh token expired');
  }

  const authed =
    audience === 'shop'
      ? await loadShopUser(stored.userId)
      : await loadPlatformUser(stored.userId);
  if (authed === null) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 401, 'User no longer active');
  }

  const result = await issueTokens(audience, authed, config, now);
  await RefreshTokenModel.updateOne(
    { _id: stored._id },
    {
      $set: {
        revokedAt: now,
        replacedByHash: hashRefreshToken(result.refreshToken),
      },
    },
  );
  return result;
};

export const logout = async (rawToken: string, audience: Audience): Promise<void> => {
  const tokenHash = hashRefreshToken(rawToken);
  await RefreshTokenModel.updateOne(
    { tokenHash, audience, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
};
