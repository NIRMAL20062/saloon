import { createHmac, randomInt } from 'node:crypto';

/**
 * Pure OTP logic — deliberately free of any DB/HTTP dependency, mirroring
 * the current app's `supabase/functions/_shared/payments-logic.ts` pattern:
 * keep the actual security-critical logic in a plain, framework-free module
 * so it's trivially unit-testable (tests/otpService.test.ts) without needing
 * a database, a running server, or mocks for either.
 */

export const OTP_CODE_LENGTH = 6;

export function generateOtpCode(): string {
  // A cryptographically secure random integer, not Math.random() — an OTP
  // is a security control, and Math.random() is not appropriate for one.
  const code = randomInt(0, 10 ** OTP_CODE_LENGTH);
  return code.toString().padStart(OTP_CODE_LENGTH, '0');
}

/**
 * OTP codes are never stored in plaintext (Security_context.md's "verification
 * codes are stored hashed" rule, carried forward from CLAUDE.md Phase 6's
 * arrival-verification codes and applied here to login OTPs too). HMAC-SHA256
 * keyed with a server-side pepper is appropriate for a 6-digit, single-use,
 * short-TTL, attempt-limited code — this isn't a long-lived password needing
 * bcrypt/argon2's deliberately slow work factor.
 */
export function hashOtpCode(code: string, phone: string, pepper: string): string {
  return createHmac('sha256', pepper).update(`${phone}:${code}`).digest('hex');
}

/**
 * Timing-safe comparison — copied intentionally from the current app's
 * `verifyRazorpaySignature`'s `timingSafeEqualHex` (payments-logic.ts): a
 * plain `===` leaks how many leading characters matched, in principle usable
 * to guess a hash byte-by-byte. Same fix, same reasoning, new context.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export type OtpChallengeRecord = {
  code_hash: string;
  expires_at: string | Date;
  attempt_count: number;
  consumed_at: string | Date | null;
};

export type OtpVerifyResult =
  | { outcome: 'valid' }
  | { outcome: 'already_consumed' }
  | { outcome: 'expired' }
  | { outcome: 'locked_out' }
  | { outcome: 'mismatched' };

/**
 * Pure decision function — given a stored challenge and a candidate code,
 * decide the outcome. No I/O: the caller (otpRoutes/repository layer) is
 * responsible for actually persisting an incremented attempt_count or a
 * consumed_at timestamp based on this result. Keeping this pure is what
 * makes every one of these branches independently unit-testable without a
 * database.
 */
export function evaluateOtpChallenge(
  challenge: OtpChallengeRecord,
  candidateCode: string,
  phone: string,
  pepper: string,
  now: Date,
  maxAttempts: number
): OtpVerifyResult {
  if (challenge.consumed_at) return { outcome: 'already_consumed' };
  if (challenge.attempt_count >= maxAttempts) return { outcome: 'locked_out' };
  if (new Date(challenge.expires_at).getTime() <= now.getTime()) return { outcome: 'expired' };

  const candidateHash = hashOtpCode(candidateCode, phone, pepper);
  if (!timingSafeEqualHex(candidateHash, challenge.code_hash)) {
    return { outcome: 'mismatched' };
  }
  return { outcome: 'valid' };
}
