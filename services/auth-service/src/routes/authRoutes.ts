import { Router } from 'express';
import { z } from 'zod';
import type { Queryable } from '../db/pool.js';
import { createProfileRepository } from '../repositories/profileRepository.js';
import { createOtpRepository } from '../repositories/otpRepository.js';
import { createRefreshTokenRepository } from '../repositories/refreshTokenRepository.js';
import { evaluateOtpChallenge, generateOtpCode, hashOtpCode } from '../services/otpService.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../services/tokenService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createOtpSendRateLimiter } from '../middleware/rateLimit.js';
import type { SmsProvider } from '../lib/smsProvider.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../lib/asyncHandler.js';

// Loose E.164 shape check, ported from the current app's
// features/auth/otp.ts — a UX nicety only, never the real security
// boundary (that's the OTP challenge itself, plus the rate limiter below).
const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, 'phone must be a valid E.164 number');

const sendOtpSchema = z.object({ phone: phoneSchema });
const verifyOtpSchema = z.object({ phone: phoneSchema, code: z.string().length(6) });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export function createAuthRouter(db: Queryable, smsProvider: SmsProvider): Router {
  const router = Router();
  const profiles = createProfileRepository(db);
  const otps = createOtpRepository(db);
  const refreshTokens = createRefreshTokenRepository(db);

  const otpSendRateLimit = createOtpSendRateLimiter(env.otpSendRateLimitPerHour, 60 * 60 * 1000);

  router.post('/otp/send', otpSendRateLimit, asyncHandler(async (req, res) => {
    const parsed = sendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'phone must be a valid E.164 number.' });
      return;
    }
    const { phone } = parsed.data;

    const code = generateOtpCode();
    const codeHash = hashOtpCode(code, phone, env.jwtSecret);
    const expiresAt = new Date(Date.now() + env.otpTtlSeconds * 1000);

    await otps.create(phone, codeHash, expiresAt);
    await smsProvider.sendOtp(phone, code);

    res.json({ sent: true });
  }));

  router.post('/otp/verify', asyncHandler(async (req, res) => {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'phone and a 6-digit code are required.' });
      return;
    }
    const { phone, code } = parsed.data;

    const challenge = await otps.findLatestActive(phone);
    if (!challenge) {
      res.status(400).json({ error: 'No active OTP for this number. Request a new one.' });
      return;
    }

    const result = evaluateOtpChallenge(challenge, code, phone, env.jwtSecret, new Date(), env.otpMaxAttempts);

    if (result.outcome !== 'valid') {
      // Every non-"already_consumed"/"locked_out" failure still counts
      // against the attempt limit — this is what actually makes the lockout
      // real, not just decorative.
      if (result.outcome === 'mismatched' || result.outcome === 'expired') {
        await otps.incrementAttempt(challenge.id);
      }
      // Deliberately one generic message regardless of which failure this
      // was — mirrors the current app's accept/reject-booking pattern of
      // not distinguishing failure reasons in a way that helps an attacker
      // enumerate valid phone numbers or remaining attempts.
      res.status(400).json({ error: 'That code is invalid or has expired.' });
      return;
    }

    await otps.markConsumed(challenge.id);
    const profile = await profiles.findOrCreateByPhone(phone);

    const accessToken = signAccessToken({ sub: profile.id, role: profile.role }, env.jwtSecret, env.accessTokenTtlSeconds);
    const { token: refreshToken, tokenHash } = generateRefreshToken();
    await refreshTokens.create(profile.id, tokenHash, new Date(Date.now() + env.refreshTokenTtlSeconds * 1000));

    res.json({ accessToken, refreshToken, profile });
  }));

  router.post('/refresh', asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'refreshToken is required.' });
      return;
    }

    const tokenHash = hashRefreshToken(parsed.data.refreshToken);
    const existing = await refreshTokens.findActiveByHash(tokenHash);
    if (!existing || new Date(existing.expires_at).getTime() <= Date.now()) {
      res.status(401).json({ error: 'Invalid or expired refresh token.' });
      return;
    }

    const profile = await profiles.findById(existing.profile_id);
    if (!profile) {
      res.status(401).json({ error: 'Invalid or expired refresh token.' });
      return;
    }

    // Rotate on every use: revoke the one just used, issue a new one. A
    // replayed (stolen, already-used) refresh token is caught here because
    // it was already revoked by its legitimate first use.
    await refreshTokens.revoke(existing.id);
    const accessToken = signAccessToken({ sub: profile.id, role: profile.role }, env.jwtSecret, env.accessTokenTtlSeconds);
    const { token: newRefreshToken, tokenHash: newHash } = generateRefreshToken();
    await refreshTokens.create(profile.id, newHash, new Date(Date.now() + env.refreshTokenTtlSeconds * 1000));

    res.json({ accessToken, refreshToken: newRefreshToken });
  }));

  router.get('/me', requireAuth, asyncHandler(async (req, res) => {
    // req.auth is guaranteed by requireAuth, but re-resolve the profile from
    // the DB rather than trusting only the JWT payload — the JWT's `role`
    // claim could be stale if an admin changed it after the token was
    // issued; this endpoint always reflects the current, real row.
    const profile = await profiles.findById(req.auth!.sub);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }
    res.json({ profile });
  }));

  return router;
}
