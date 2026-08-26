-- Phase 3: partner shop write access.
--
-- 0001_init.sql created `shops` with RLS enabled and zero write policies —
-- deliberately unwritable by anyone. 0002 added a public read policy scoped
-- to `status = 'approved'`. This migration adds what a partner actually
-- needs to manage their own shop: reading it regardless of approval status
-- (a brand-new shop is `pending`, and its owner still needs to see/edit it),
-- creating it, and updating the fields an owner should control.
--
-- `status`, `owner_id`, and `commission_pct` are deliberately NOT things a
-- partner can set via a client request, even though the row-level
-- `owner_id = auth.uid()` check below would otherwise allow it — a crafted
-- insert/update could self-approve a shop (`status = 'approved'`, making it
-- publicly visible per 0002's read policy without real admin approval) or
-- move it under a different owner. RLS only controls which *rows* a client
-- can touch, not which *columns* within an allowed row (CLAUDE.md Section
-- 4.1) — so a trigger enforces this regardless of what the client sends,
-- holding even if a policy is ever loosened by mistake.
--
-- Edge Functions using the service-role key (Phase 12's admin-approval flow)
-- connect as Postgres role `service_role`, which bypasses RLS but NOT
-- triggers — so the trigger explicitly steps aside for that role via
-- `auth.role() = 'service_role'`, or Phase 12 would never be able to flip a
-- shop's status at all.

create or replace function public.protect_shop_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
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

create trigger shops_protect_admin_fields
  before insert or update on public.shops
  for each row execute function public.protect_shop_admin_fields();

create policy "shops: owner reads own row"
  on public.shops for select
  using (owner_id = auth.uid());

create policy "shops: owner inserts own row"
  on public.shops for insert
  with check (owner_id = auth.uid());

create policy "shops: owner updates own row"
  on public.shops for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Shop deletion is intentionally NOT added yet: once Phase 4 introduces
-- `bookings` referencing `shop_id`, a hard delete here could orphan booking
-- history. Revisit as a soft-delete (e.g. a `status = 'closed'` value) when
-- that phase lands, rather than adding a real DELETE policy now. TODO(phase 4+).
