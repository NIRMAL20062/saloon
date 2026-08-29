import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { newDb, DataType } from 'pg-mem';
import { beforeEach, describe, expect, it } from 'vitest';
import { createProfileRepository } from '../src/repositories/profileRepository.js';
import type { Queryable } from '../src/db/pool.js';

/**
 * This sandbox has no working Docker daemon and no local Postgres install
 * (both checked directly — see the session notes), so a real integration
 * test against an actual Postgres server isn't possible here. `pg-mem`
 * emulates enough of Postgres in-memory, in plain Node, to run the *real*
 * migration SQL and the *real* parameterized queries from
 * profileRepository.ts against it — this is a genuine test of the actual
 * SQL, not a hand-written mock of what the DB "should" do. It is still not
 * a substitute for running this migration against a real Postgres once
 * staging infra exists (Phase 0) — anyone picking this up should do that
 * before trusting this in production.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(path.join(__dirname, '../src/db/migrations/0001_init.sql'), 'utf-8');

function createTestDb(): Queryable {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });
  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool() as unknown as Queryable;

  // Run the actual migration file, not a re-typed copy of it — if the real
  // migration has a typo or an incompatible construct, this test fails
  // instead of silently testing something else.
  for (const statement of migrationSql.split(';').map((s) => s.trim()).filter(Boolean)) {
    db.public.none(statement);
  }

  return pool;
}

describe('profileRepository (against an in-memory Postgres via pg-mem)', () => {
  let db: Queryable;

  beforeEach(() => {
    db = createTestDb();
  });

  it('returns null for a phone number with no profile yet', async () => {
    const repo = createProfileRepository(db);
    expect(await repo.findByPhone('+919999999999')).toBeNull();
  });

  it('creates a profile on first login, defaulting role to customer', async () => {
    const repo = createProfileRepository(db);
    const profile = await repo.findOrCreateByPhone('+919999999999');

    expect(profile.phone).toBe('+919999999999');
    expect(profile.role).toBe('customer');
    expect(profile.id).toBeTruthy();
  });

  it('returns the same profile on a second login for the same phone, not a duplicate', async () => {
    const repo = createProfileRepository(db);
    const first = await repo.findOrCreateByPhone('+919999999999');
    const second = await repo.findOrCreateByPhone('+919999999999');

    expect(second.id).toBe(first.id);
  });

  it('finds a profile by id after creation', async () => {
    const repo = createProfileRepository(db);
    const created = await repo.findOrCreateByPhone('+919999999999');
    const found = await repo.findById(created.id);

    expect(found?.phone).toBe('+919999999999');
  });

  it('enforces the phone uniqueness constraint from the real migration', async () => {
    const repo = createProfileRepository(db);
    await repo.findOrCreateByPhone('+919999999999');

    // A direct insert bypassing findOrCreateByPhone's own check — this
    // proves the *database constraint* itself is doing the enforcing, not
    // just the repository's application-level lookup-then-insert (which,
    // on its own, would have the same race-condition gap the current app's
    // migration comments explicitly warn against for booking collisions).
    await expect(db.query(`insert into profiles (phone) values ($1)`, ['+919999999999'])).rejects.toThrow();
  });
});
