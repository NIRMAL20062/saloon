import express from 'express';
import { env } from './config/env.js';
import { createPool } from './db/pool.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { consoleSmsProvider } from './lib/smsProvider.js';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

const pool = createPool();
app.use('/auth', createAuthRouter(pool, consoleSmsProvider));

// Centralized error handling — traps anything a route handler didn't catch,
// sanitizes it before it ever reaches the client (Security_context.md
// Section 5: "sanitizes stack traces before returning them to clients").
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[auth-service] unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[auth-service] listening on :${env.port}`);
});
