import type { NextFunction, Request, Response } from 'express';

/**
 * In-memory, per-process rate limiting — fine for a single instance / this
 * phase, but will under-count once this service runs as multiple replicas
 * behind a load balancer (each replica keeps its own counters). Swap the
 * `store` for a Redis-backed one (Section 5 of docs/TARGET_ARCHITECTURE.md
 * already earmarks Redis for exactly this kind of shared, ephemeral state)
 * the moment this service is deployed with more than one replica — flagged
 * here rather than silently left as a scaling surprise.
 */
type RateLimitStore = Map<string, { count: number; windowStart: number }>;

export function createOtpSendRateLimiter(maxPerWindow: number, windowMs: number) {
  const store: RateLimitStore = new Map();

  return function otpSendRateLimit(req: Request, res: Response, next: NextFunction) {
    const phone = typeof req.body?.phone === 'string' ? req.body.phone : null;
    if (!phone) return next(); // let the route's own validation reject a missing/malformed phone

    const now = Date.now();
    const entry = store.get(phone);

    if (!entry || now - entry.windowStart >= windowMs) {
      store.set(phone, { count: 1, windowStart: now });
      return next();
    }

    if (entry.count >= maxPerWindow) {
      res.status(429).json({ error: 'Too many OTP requests for this number. Try again later.' });
      return;
    }

    entry.count += 1;
    next();
  };
}
