import type { Queryable } from '../db/pool.js';
import type { OtpChallengeRecord } from '../services/otpService.js';

export function createOtpRepository(db: Queryable) {
  return {
    async create(phone: string, codeHash: string, expiresAt: Date): Promise<void> {
      await db.query(
        `insert into otp_challenges (phone, code_hash, expires_at) values ($1, $2, $3)`,
        [phone, codeHash, expiresAt]
      );
    },

    /** The most recent, not-yet-consumed challenge for this phone — there can be several historical rows if a user retried. */
    async findLatestActive(phone: string): Promise<(OtpChallengeRecord & { id: string }) | null> {
      const result = await db.query<OtpChallengeRecord & { id: string }>(
        `select id, code_hash, expires_at, attempt_count, consumed_at
         from otp_challenges
         where phone = $1 and consumed_at is null
         order by created_at desc
         limit 1`,
        [phone]
      );
      return result.rows[0] ?? null;
    },

    async incrementAttempt(id: string): Promise<void> {
      await db.query(`update otp_challenges set attempt_count = attempt_count + 1 where id = $1`, [id]);
    },

    async markConsumed(id: string): Promise<void> {
      await db.query(`update otp_challenges set consumed_at = now() where id = $1`, [id]);
    },

    /** For the send-rate-limit check — how many challenges were created for this phone in the given window. */
    async countCreatedSince(phone: string, since: Date): Promise<number> {
      const result = await db.query<{ count: string }>(
        `select count(*)::text as count from otp_challenges where phone = $1 and created_at >= $2`,
        [phone, since]
      );
      return Number(result.rows[0]?.count ?? '0');
    },
  };
}

export type OtpRepository = ReturnType<typeof createOtpRepository>;
