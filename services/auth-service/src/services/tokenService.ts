import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';

export type SessionTokenPayload = {
  sub: string; // profile id
  role: 'customer' | 'partner' | 'admin';
};

/**
 * Access tokens are short-lived, signed JWTs — validated by the API Gateway
 * (or, until a separate Gateway process exists, by this service's own
 * `middleware/requireAuth.ts`) on every request, the direct replacement for
 * what Supabase Auth's JWT already did in the current app.
 */
export function signAccessToken(payload: SessionTokenPayload, secret: string, ttlSeconds: number): string {
  return jwt.sign(payload, secret, { expiresIn: ttlSeconds });
}

export function verifyAccessToken(token: string, secret: string): SessionTokenPayload {
  // Throws on an invalid/expired/tampered token — the caller (requireAuth
  // middleware) is responsible for turning that into a 401, never leaking
  // the underlying jsonwebtoken error message to the client.
  return jwt.verify(token, secret) as SessionTokenPayload;
}

/**
 * Refresh tokens are NOT JWTs — they're opaque random strings, stored only
 * as a hash (refresh_tokens.token_hash), so a database leak doesn't hand out
 * usable refresh tokens the way it would if the raw token were stored. This
 * also makes a refresh token genuinely revocable (set revoked_at) — a bare
 * stateless JWT can only be waited out until it expires, it can't be
 * un-issued.
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashRefreshToken(token);
  return { token, tokenHash };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
