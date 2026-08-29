import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 (unlike 5) does NOT forward a rejected promise from an async
 * route handler to `next()` automatically — an unhandled rejection inside
 * one crashes the whole process instead of reaching the centralized error
 * handler in src/index.ts. Confirmed the hard way: a DB-connection failure
 * inside an unwrapped `async (req, res) => {...}` handler took the entire
 * service down (`ECONNREFUSED` → unhandled rejection → process exit),
 * rather than returning a clean 500. Every async route handler in this
 * service must be wrapped with this.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
