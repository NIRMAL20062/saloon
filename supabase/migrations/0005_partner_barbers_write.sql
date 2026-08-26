-- Phase 3: partner barbers write access (barbers CRUD, slice 3).
--
-- Mirrors 0004's reasoning for `services`: ownership is indirect —
-- `barbers.shop_id` -> `shops.owner_id` — so every policy re-checks that join
-- rather than trusting a client-supplied `shop_id` at face value.
-- The UPDATE policy's `with check` also blocks a partner from reassigning a
-- barber to a shop they don't own.

create policy "barbers: owner reads own rows"
  on public.barbers for select
  using (
    exists (
      select 1 from public.shops s
      where s.id = barbers.shop_id and s.owner_id = auth.uid()
    )
  );

create policy "barbers: owner inserts own rows"
  on public.barbers for insert
  with check (
    exists (
      select 1 from public.shops s
      where s.id = barbers.shop_id and s.owner_id = auth.uid()
    )
  );

create policy "barbers: owner updates own rows"
  on public.barbers for update
  using (
    exists (
      select 1 from public.shops s
      where s.id = barbers.shop_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shops s
      where s.id = barbers.shop_id and s.owner_id = auth.uid()
    )
  );
