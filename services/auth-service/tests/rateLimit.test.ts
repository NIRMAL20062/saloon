import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createOtpSendRateLimiter } from '../src/middleware/rateLimit.js';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('createOtpSendRateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = createOtpSendRateLimiter(3, 60_000);
    const next = vi.fn();
    const req = { body: { phone: '+919999999999' } } as Request;

    limiter(req, mockRes(), next);
    limiter(req, mockRes(), next);
    limiter(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(3);
  });

  it('blocks once the limit is exceeded within the window', () => {
    const limiter = createOtpSendRateLimiter(2, 60_000);
    const next = vi.fn();
    const req = { body: { phone: '+919999999999' } } as Request;

    limiter(req, mockRes(), next);
    limiter(req, mockRes(), next);
    const res = mockRes();
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('tracks each phone number independently', () => {
    const limiter = createOtpSendRateLimiter(1, 60_000);
    const next = vi.fn();

    limiter({ body: { phone: '+911111111111' } } as Request, mockRes(), next);
    limiter({ body: { phone: '+912222222222' } } as Request, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('resets after the window elapses', () => {
    vi.useFakeTimers();
    const limiter = createOtpSendRateLimiter(1, 1_000);
    const next = vi.fn();
    const req = { body: { phone: '+919999999999' } } as Request;

    limiter(req, mockRes(), next);
    vi.advanceTimersByTime(1_001);
    limiter(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
