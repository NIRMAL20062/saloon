import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type SessionTokenPayload } from '../services/tokenService.js';
import { env } from '../config/env.js';

/**
 * Token validation belongs to a dedicated API Gateway in the full target
 * architecture (docs/TARGET_ARCHITECTURE.md Section 4.1) — this service
 * implements it directly for now because it's the only backend service that
 * exists yet (Phase 1). There's no real value in standing up a separate
 * Gateway process to route to exactly one service; that becomes worth doing
 * once Phase 2's Discovery Service exists and there's actually more than one
 * place to route between. This middleware is written so lifting it out into
 * a real Gateway later is a copy, not a redesign.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: SessionTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  try {
    req.auth = verifyAccessToken(token, env.jwtSecret);
    next();
  } catch {
    // Never forward the underlying jsonwebtoken error (expiry details,
    // signature-mismatch specifics) to the client — same "don't leak
    // internals" discipline as the current app's Edge Functions.
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
}
