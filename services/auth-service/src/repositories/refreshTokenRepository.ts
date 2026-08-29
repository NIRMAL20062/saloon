import type { Queryable } from '../db/pool.js';

export function createRefreshTokenRepository(db: Queryable) {
  return {
    async create(profileId: string, tokenHash: string, expiresAt: Date): Promise<void> {
      await db.query(
        `insert into refresh_tokens (profile_id, token_hash, expires_at) values ($1, $2, $3)`,
        [profileId, tokenHash, expiresAt]
      );
    },

    async findActiveByHash(
      tokenHash: string
    ): Promise<{ id: string; profile_id: string; expires_at: string; revoked_at: string | null } | null> {
      const result = await db.query(
        `select id, profile_id, expires_at, revoked_at
         from refresh_tokens
         where token_hash = $1 and revoked_at is null`,
        [tokenHash]
      );
      return result.rows[0] ?? null;
    },

    /** Revoked on every refresh use — refresh tokens are single-use and rotate, so a stolen-then-replayed token is caught immediately. */
    async revoke(id: string): Promise<void> {
      await db.query(`update refresh_tokens set revoked_at = now() where id = $1`, [id]);
    },
  };
}

export type RefreshTokenRepository = ReturnType<typeof createRefreshTokenRepository>;
