-- Phase 2: customer discovery is read-only.
--
-- Fulfils the promise left in 0001_init.sql's comments: `shops`/`services`/
-- `barbers` had RLS enabled but zero policies, so they were unreadable from
-- any client. This adds public (any authenticated user) read access, scoped
-- to only what a customer should ever see: approved shops, and active
-- services/barbers that belong to an approved shop. Owner write policies are
-- still not present — those arrive in Phase 3.

create policy "shops: read approved"
  on public.shops for select
  using (status = 'approved');

create policy "services: read active for approved shops"
  on public.services for select
  using (
    is_active
    and exists (
      select 1 from public.shops s
      where s.id = services.shop_id and s.status = 'approved'
    )
  );

create policy "barbers: read active for approved shops"
  on public.barbers for select
  using (
    is_active
    and exists (
      select 1 from public.shops s
      where s.id = barbers.shop_id and s.status = 'approved'
    )
  );
