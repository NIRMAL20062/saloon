import { Pool } from 'pg';
import { env } from '../config/env.js';

/**
 * The minimal shape every repository actually depends on — just `query()`.
 * Repositories are typed against this, not the concrete `pg.Pool`, so tests
 * can inject a pg-mem-backed adapter (see tests/profileRepository.test.ts)
 * without needing a real Postgres server or Docker in this sandbox. Real
 * deployments (staging/production) use `createPool()` below unchanged.
 */
export type Queryable = {
  query: Pool['query'];
};

export function createPool(): Pool {
  return new Pool({ connectionString: env.databaseUrl });
}
