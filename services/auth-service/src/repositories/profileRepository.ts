import type { Queryable } from '../db/pool.js';

export type Role = 'customer' | 'partner' | 'admin';

export type Profile = {
  id: string;
  phone: string;
  full_name: string | null;
  photo_url: string | null;
  role: Role;
  created_at: string;
};

/**
 * Every query here is parameterized ($1, $2, ...) — zero string
 * concatenation of caller input into SQL, matching the current app's
 * standing rule (Security_context.md Section 2.A) and the same discipline
 * that would normally come from an ORM/query-builder layer.
 */
export function createProfileRepository(db: Queryable) {
  return {
    async findByPhone(phone: string): Promise<Profile | null> {
      const result = await db.query<Profile>('select * from profiles where phone = $1', [phone]);
      return result.rows[0] ?? null;
    },

    async findById(id: string): Promise<Profile | null> {
      const result = await db.query<Profile>('select * from profiles where id = $1', [id]);
      return result.rows[0] ?? null;
    },

    /**
     * First-login provisioning: a phone number that verifies OTP for the
     * first time gets a `customer` profile automatically. `role` is
     * deliberately NOT a parameter here — it always starts at the default
     * and is changed only through a separate, explicitly-audited admin path
     * (Phase 12), never as a side effect of login. This mirrors the current
     * app's `protect_profile_role` trigger: there is no RLS/trigger doing
     * this for free anymore, so this repository function is the one and
     * only place a profile can be created, and it hardcodes the safe
     * default rather than trusting any caller-supplied role.
     */
    async findOrCreateByPhone(phone: string): Promise<Profile> {
      const existing = await this.findByPhone(phone);
      if (existing) return existing;

      const result = await db.query<Profile>(
        `insert into profiles (phone, role) values ($1, 'customer') returning *`,
        [phone]
      );
      const created = result.rows[0];
      if (!created) {
        throw new Error('Failed to create profile — insert returned no row.');
      }
      return created;
    },
  };
}

export type ProfileRepository = ReturnType<typeof createProfileRepository>;
