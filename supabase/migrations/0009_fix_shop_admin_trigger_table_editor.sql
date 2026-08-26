-- Fix: 0003's `protect_shop_admin_fields` trigger blocked the Table Editor
-- itself, not just app clients.
--
-- The trigger only skipped protection when `auth.role() = 'service_role'` —
-- true for Edge Functions (which authenticate with the service-role JWT via
-- PostgREST), but the Supabase Studio Table Editor connects as the Postgres
-- role `postgres` directly, with no JWT/`request.jwt.claims` at all, so
-- `auth.role()` returns null there. Every manual `status` edit from the
-- Table Editor was silently reverted back to its old value — exactly the
-- "for now, just default new shops to approved manually in the table
-- editor" workflow CLAUDE.md's Phase 3 relies on, broken by 0003's own
-- protection.
--
-- Fix: also skip protection for `current_user = 'postgres'` (the role behind
-- the Table Editor, the CLI, and migrations/seed scripts) — this doesn't
-- weaken anything the trigger was actually meant to stop, since that
-- protection is about `anon`/`authenticated` clients going through
-- PostgREST, not about privileged direct database access, which was always
-- able to bypass RLS entirely anyway.
create or replace function public.protect_shop_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' or current_user = 'postgres' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.commission_pct := 10.00;
  elsif tg_op = 'UPDATE' then
    new.status := old.status;
    new.owner_id := old.owner_id;
    new.commission_pct := old.commission_pct;
  end if;

  return new;
end;
$$;
