-- Auth Service — Phase 1 schema.
--
-- Ports `profiles` from the current app's Supabase schema (supabase/migrations/0001_init.sql)
-- verbatim in shape — same columns, same role model. This is intentional:
-- the domain model doesn't change with the new architecture (see
-- docs/TARGET_ARCHITECTURE.md Section 1), only how it's hosted and enforced.
--
-- What's different from the Supabase version: there is no Row Level Security
-- here (this is a self-managed Postgres instance, not Supabase's PostgREST
-- layer) — every access check that RLS used to provide for free is now the
-- Auth Service's own responsibility, enforced in application code
-- (repositories/profileRepository.ts), per docs/TARGET_ARCHITECTURE.md
-- Section 8's explicit warning that this is the one place the new
-- architecture has to work harder than the old one to keep the same
-- guarantee.

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  full_name text,
  photo_url text,
  role text not null default 'customer' check (role in ('customer', 'partner', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_phone_idx on profiles (phone);

-- One-time OTP challenges. Never stores the code in plaintext — only its
-- hash — mirroring the current app's `code_hash` pattern for arrival
-- verification codes (CLAUDE.md Phase 6) applied here to login OTPs too.
create table if not exists otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempt_count integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists otp_challenges_phone_idx on otp_challenges (phone);

-- Refresh tokens are stored hashed and revocable — a stolen refresh token
-- can be invalidated server-side (setting revoked_at), unlike a bare stateless
-- JWT with no server-side record, which can only be waited out until expiry.
create table if not exists refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists refresh_tokens_profile_id_idx on refresh_tokens (profile_id);
