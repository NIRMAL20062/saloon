import { describe, expect, it } from 'vitest';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from '../src/services/tokenService.js';

const SECRET = 'test-jwt-secret-do-not-use-in-prod';

describe('access tokens', () => {
  it('round-trips a signed payload', () => {
    const token = signAccessToken({ sub: 'profile-1', role: 'customer' }, SECRET, 60);
    const payload = verifyAccessToken(token, SECRET);
    expect(payload.sub).toBe('profile-1');
    expect(payload.role).toBe('customer');
  });

  it('rejects a token signed with a different secret', () => {
    const token = signAccessToken({ sub: 'profile-1', role: 'customer' }, 'a-different-secret', 60);
    expect(() => verifyAccessToken(token, SECRET)).toThrow();
  });

  it('rejects an expired token', async () => {
    const token = signAccessToken({ sub: 'profile-1', role: 'customer' }, SECRET, -1); // already expired
    expect(() => verifyAccessToken(token, SECRET)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('generates a token whose hash matches hashRefreshToken()', () => {
    const { token, tokenHash } = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(tokenHash);
  });

  it('generates unique tokens on each call', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});
