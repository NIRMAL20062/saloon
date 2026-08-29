import 'dotenv/config';

/**
 * Config validation, crash-fast on a missing critical secret — carried
 * forward verbatim from the current app's hard-won lesson (see
 * ../../../supabase/functions/razorpay-webhook/index.ts's secret check, and
 * docs/TARGET_ARCHITECTURE.md Section 8). A missing DATABASE_URL or
 * JWT_SECRET must stop this service from starting at all, never fall back to
 * an insecure default or start "half-configured."
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    // Thrown at import time (module load), before the HTTP server ever
    // starts listening — this is what "crash-fast" means in practice.
    throw new Error(
      `[auth-service] Missing required environment variable: ${name}. Refusing to start.`
    );
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4001),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 60 * 15), // 15 min
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 30), // 30 days
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 60 * 5), // 5 min, matches the current app's OTP expectations
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  otpSendRateLimitPerHour: Number(process.env.OTP_SEND_RATE_LIMIT_PER_HOUR ?? 5),
};
