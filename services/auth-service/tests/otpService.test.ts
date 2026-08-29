import { describe, expect, it } from 'vitest';
import {
  evaluateOtpChallenge,
  generateOtpCode,
  hashOtpCode,
  timingSafeEqualHex,
  OTP_CODE_LENGTH,
} from '../src/services/otpService.js';

const PEPPER = 'test-pepper-do-not-use-in-prod';
const PHONE = '+919999999999';

describe('generateOtpCode', () => {
  it('generates a code of the expected length, zero-padded', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toHaveLength(OTP_CODE_LENGTH);
      expect(/^\d+$/.test(code)).toBe(true);
    }
  });
});

describe('timingSafeEqualHex', () => {
  it('accepts identical strings', () => {
    expect(timingSafeEqualHex('abc123', 'abc123')).toBe(true);
  });
  it('rejects a length mismatch outright', () => {
    expect(timingSafeEqualHex('abc', 'abcd')).toBe(false);
  });
  it('rejects a same-length mismatch', () => {
    expect(timingSafeEqualHex('abc123', 'abc124')).toBe(false);
  });
});

describe('evaluateOtpChallenge', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const future = new Date('2026-01-01T00:05:00Z');
  const past = new Date('2025-12-31T23:55:00Z');

  function challenge(overrides: Partial<Parameters<typeof evaluateOtpChallenge>[0]> = {}) {
    return {
      code_hash: hashOtpCode('123456', PHONE, PEPPER),
      expires_at: future,
      attempt_count: 0,
      consumed_at: null,
      ...overrides,
    };
  }

  it('accepts the correct code before expiry, under the attempt limit', () => {
    const result = evaluateOtpChallenge(challenge(), '123456', PHONE, PEPPER, now, 5);
    expect(result.outcome).toBe('valid');
  });

  it('rejects the wrong code', () => {
    const result = evaluateOtpChallenge(challenge(), '000000', PHONE, PEPPER, now, 5);
    expect(result.outcome).toBe('mismatched');
  });

  it('rejects an expired challenge even with the right code', () => {
    const result = evaluateOtpChallenge(challenge({ expires_at: past }), '123456', PHONE, PEPPER, now, 5);
    expect(result.outcome).toBe('expired');
  });

  it('rejects an already-consumed challenge', () => {
    const result = evaluateOtpChallenge(challenge({ consumed_at: past }), '123456', PHONE, PEPPER, now, 5);
    expect(result.outcome).toBe('already_consumed');
  });

  it('locks out once attempt_count reaches the max, even with the right code', () => {
    const result = evaluateOtpChallenge(challenge({ attempt_count: 5 }), '123456', PHONE, PEPPER, now, 5);
    expect(result.outcome).toBe('locked_out');
  });

  it('is scoped to the phone number the hash was computed for', () => {
    // The same code, hashed for a different phone, must not verify — this
    // is what stops an attacker from replaying a code they observed being
    // sent to someone else's number.
    const otherPhonesChallenge = challenge({ code_hash: hashOtpCode('123456', '+911111111111', PEPPER) });
    const result = evaluateOtpChallenge(otherPhonesChallenge, '123456', PHONE, PEPPER, now, 5);
    expect(result.outcome).toBe('mismatched');
  });
});
