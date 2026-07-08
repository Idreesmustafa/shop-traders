import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';

export const AUDIENCES = ['shop', 'admin'] as const;
export type Audience = (typeof AUDIENCES)[number];

const ISSUER = 'shop-traders';

export type AccessClaims = {
  sub: string;
  aud: Audience;
  role: string;
  shopId: string | undefined;
};

export type AccessTokenConfig = {
  secret: string;
  ttlMinutes: number;
};

export const signAccessToken = (
  claims: AccessClaims,
  config: AccessTokenConfig,
): string => {
  const payload: Record<string, string> = { sub: claims.sub, role: claims.role };
  if (claims.shopId !== undefined) payload['shopId'] = claims.shopId;
  return jwt.sign(payload, config.secret, {
    audience: claims.aud,
    issuer: ISSUER,
    expiresIn: `${config.ttlMinutes}m`,
  });
};

export const verifyAccessToken = (
  token: string,
  audience: Audience,
  secret: string,
): AccessClaims => {
  const decoded = jwt.verify(token, secret, { audience, issuer: ISSUER });
  if (typeof decoded === 'string') {
    throw new Error('malformed token payload');
  }
  const sub = decoded.sub;
  if (typeof sub !== 'string') {
    throw new Error('token missing sub');
  }
  const role = decoded['role'];
  if (typeof role !== 'string') {
    throw new Error('token missing role');
  }
  const shopIdRaw = decoded['shopId'];
  const shopId = typeof shopIdRaw === 'string' ? shopIdRaw : undefined;
  return { sub, aud: audience, role, shopId };
};

export const generateRefreshToken = (): string => randomBytes(32).toString('hex');

export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
