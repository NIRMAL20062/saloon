-- Phase 3: partner services write access (services CRUD, slice 2).
--
-- Mirrors 0003's reasoning for `shops`, but ownership here is indirect —
-- `services.shop_id` -> `shops.owner_id` — so every policy re-checks that
-- join rather than trusting a client-supplied `shop_id` at face value
-- (CLAUDE.md Section 5.4: "every ID passed from the client is re-resolved
-- against the database"). The same join in the UPDATE policy's `with check`
-- also blocks a partner from reassigning a service to a shop they don't own.
--
-- "Sane max duration" (CLAUDE.md Phase 3 build list) is enforced at both
-- layers, not just the app: 480 minutes (8 hours) as a hard ceiling here,
-- with a friendlier client-side check in features/shops/partner-api.ts so a
-- typo (e.g. an extra zero) never reaches the database as a rejected write
-- with no explanation.
--
-- No DELETE policy is added, on purpose — same reasoning as the shops-delete
-- TODO in 0003. Once Phase 4 adds `booking_services` referencing
-- `service_id`, a hard delete here could orphan booking history. A partner
-- "removes" a service by toggling `is_active` off instead; 0002's read
-- policy already hides inactive services from customers, so that fully
-- covers "I stopped offering this" without ever deleting a row a past
-- booking might reference. Revisit real deletion, if ever, only for
-- services with zero booking history. TODO(phase 4+).

alter table public.services
  add constraint services_duration_min_sane check (duration_min <= 480);

create policy "services: owner reads own rows"
  on public.services for select
  using (
    exists (
      select 1 from public.shops s
      where s.id = services.shop_id and s.owner_id = auth.uid()
    )
  );

create policy "services: owner inserts own rows"
  on public.services for insert
  with check (
    exists (
      select 1 from public.shops s
      where s.id = services.shop_id and s.owner_id = auth.uid()
    )
  );

create policy "services: owner updates own rows"
  on public.services for update
  using (
    exists (
      select 1 from public.shops s
      where s.id = services.shop_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shops s
      where s.id = services.shop_id and s.owner_id = auth.uid()
    )
  );
