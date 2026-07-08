import { describe, expect, it } from 'vitest';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from './auth.tokens.js';

const SECRET = 'x'.repeat(32);

describe('access token', () => {
  it('roundtrips a shop claim through sign + verify', () => {
    const token = signAccessToken(
      { sub: 'u1', aud: 'shop', role: 'owner', shopId: 's1' },
      { secret: SECRET, ttlMinutes: 15 },
    );
    const claims = verifyAccessToken(token, 'shop', SECRET);
    expect(claims.sub).toBe('u1');
    expect(claims.role).toBe('owner');
    expect(claims.shopId).toBe('s1');
    expect(claims.aud).toBe('shop');
  });

  it('rejects a token verified against the wrong audience', () => {
    const token = signAccessToken(
      { sub: 'u1', aud: 'shop', role: 'owner', shopId: 's1' },
      { secret: SECRET, ttlMinutes: 15 },
    );
    expect(() => verifyAccessToken(token, 'admin', SECRET)).toThrow();
  });

  it('rejects a token signed with a different secret', () => {
    const token = signAccessToken(
      { sub: 'u1', aud: 'shop', role: 'owner', shopId: 's1' },
      { secret: SECRET, ttlMinutes: 15 },
    );
    expect(() => verifyAccessToken(token, 'shop', 'y'.repeat(32))).toThrow();
  });

  it('preserves platform tokens without shopId', () => {
    const token = signAccessToken(
      { sub: 'p1', aud: 'admin', role: 'super_admin', shopId: undefined },
      { secret: SECRET, ttlMinutes: 15 },
    );
    const claims = verifyAccessToken(token, 'admin', SECRET);
    expect(claims.shopId).toBeUndefined();
  });
});

describe('refresh token', () => {
  it('generates opaque tokens of the expected length', () => {
    const token = generateRefreshToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashRefreshToken is deterministic', () => {
    expect(hashRefreshToken('abc')).toBe(hashRefreshToken('abc'));
    expect(hashRefreshToken('abc')).not.toBe(hashRefreshToken('abd'));
  });
});
