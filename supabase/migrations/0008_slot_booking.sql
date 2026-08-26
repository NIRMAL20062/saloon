-- Phase 4: Slot Booking (no payment yet).
--
-- Adds `bookings`, `booking_services`, `booking_events`, and every write path
-- for them — all as `security definer` Postgres functions, never direct
-- client INSERT/UPDATE. This mirrors the Phase 9 pattern CLAUDE.md's own doc
-- sketches for Instant Booking's atomic accept ("a single conditional UPDATE
-- that only succeeds for the first shop to hit it") and applies it from the
-- very first phase that needs a state machine, not just when Instant
-- Booking arrives later.
--
-- Money is explicitly NOT part of this phase: `service_amount`/`total_amount`
-- are computed and stored so Phase 5 has real numbers to charge against, but
-- nothing here talks to Razorpay, and a rejected/expired booking here simply
-- ends — no payment was ever taken, so there's nothing to refund.

-- btree_gist adds GiST support for plain equality on scalar types (uuid,
-- here) — a bare GiST index only understands range/geometric operators on
-- its own, so this is what lets the exclusion constraint below combine
-- "same barber" (equality) with "overlapping time range" (&&) in one index.
create extension if not exists btree_gist;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  shop_id uuid not null references public.shops (id),
  barber_id uuid not null references public.barbers (id),
  -- Only 'slot' exists yet — Phase 9 widens this constraint (and adds
  -- 'broadcasting' etc. below) when Instant Booking actually lands, not
  -- before (CLAUDE.md Section 2, rule 9).
  mode text not null default 'slot' check (mode = 'slot'),
  status text not null default 'draft'
    check (status in ('draft', 'awaiting_shop', 'confirmed', 'rejected', 'expired')),
  scheduled_at timestamptz not null,
  -- The exact moment this booking stops occupying its barber's calendar —
  -- service duration plus the back-to-back buffer (CLAUDE.md Section 13's
  -- Phase 4 note), computed server-side in `create_slot_booking` below, never
  -- trusted from a client. Stored explicitly (not derived on the fly) so the
  -- exclusion constraint below can reference it directly.
  ends_at timestamptz not null,
  service_amount integer not null check (service_amount > 0), -- paise, sum of booking_services.price
  total_amount integer not null check (total_amount > 0), -- paise; equals service_amount until Phase 5 adds fees
  slot_hold_expires_at timestamptz not null,
  shop_response_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  check (ends_at > scheduled_at)
);

alter table public.bookings enable row level security;

-- The actual collision guarantee CLAUDE.md Phase 4 calls for ("the server
-- must check for overlapping confirmed/held bookings for that barber+time in
-- one transaction before creating the hold") — enforced by Postgres itself
-- at INSERT/UPDATE time via the unique index backing this constraint, not by
-- a SELECT-then-INSERT in application code (which would have a race: two
-- concurrent requests could both pass the SELECT check before either
-- INSERTs). A partial constraint — only rows whose status is still "live"
-- participate, so a rejected/expired booking automatically stops blocking
-- the slot it used to hold the instant its status changes.
alter table public.bookings
  add constraint bookings_no_barber_overlap
  exclude using gist (
    barber_id with =,
    -- `tstzrange`, not `tsrange` — `scheduled_at`/`ends_at` are `timestamptz`
    -- columns; `tsrange` is for the timezone-naive `timestamp` type and would
    -- fail to apply against these.
    tstzrange(scheduled_at, ends_at, '[)') with &&
  )
  where (status in ('draft', 'awaiting_shop', 'confirmed'));

create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_shop_id_idx on public.bookings (shop_id);
create index bookings_barber_id_idx on public.bookings (barber_id);

create policy "bookings: customer reads own bookings"
  on public.bookings for select
  using (customer_id = auth.uid());

create policy "bookings: shop owner reads their shop's bookings"
  on public.bookings for select
  using (
    exists (
      select 1 from public.shops s
      where s.id = bookings.shop_id and s.owner_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policy at all, on purpose (CLAUDE.md Section 5.2 /
-- Section 4.1): every write to `bookings.status` goes through one of the
-- `security definer` functions below, called only from Edge Functions using
-- the service-role key. A client holding a valid session can read their own
-- rows but can never set a booking's status directly, no matter what a
-- crafted request claims.

create table public.booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  service_id uuid not null references public.services (id),
  price integer not null check (price > 0) -- paise, snapshotted server-side at booking time
);

alter table public.booking_services enable row level security;
create index booking_services_booking_id_idx on public.booking_services (booking_id);

create policy "booking_services: readable by the booking's customer or shop"
  on public.booking_services for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_services.booking_id
        and (
          b.customer_id = auth.uid()
          or exists (select 1 from public.shops s where s.id = b.shop_id and s.owner_id = auth.uid())
        )
    )
  );

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  status text not null,
  actor_id uuid references public.profiles (id), -- null for system-triggered events (e.g. the expiry sweep)
  note text,
  created_at timestamptz not null default now()
);

alter table public.booking_events enable row level security;
create index booking_events_booking_id_idx on public.booking_events (booking_id);

create policy "booking_events: readable by the booking's customer or shop"
  on public.booking_events for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_events.booking_id
        and (
          b.customer_id = auth.uid()
          or exists (select 1 from public.shops s where s.id = b.shop_id and s.owner_id = auth.uid())
        )
    )
  );

-- `profiles`' only policy until now was "read own row" (Phase 1) — correct
-- as the default, but it leaves a shop owner with no way to see who actually
-- booked: they could read the `bookings` row itself (their own shop) but not
-- the customer's name, since that lives in a `profiles` row belonging to
-- someone else. This is additive (RLS SELECT policies are OR'd together),
-- scoped exactly to "a customer who has booked at this shop," and never
-- widens what the *customer's own* policy already allows anyone else to see
-- of their own row.
create policy "profiles: shop owner reads profiles of their bookings' customers"
  on public.profiles for select
  using (
    exists (
      select 1 from public.bookings b
      join public.shops s on s.id = b.shop_id
      where b.customer_id = profiles.id and s.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- create_slot_booking — called only from the `create-booking` Edge Function.
--
-- Re-derives everything from the database rather than trusting the caller:
-- the shop must be approved and open, the barber must belong to that shop
-- and be active, every requested service must belong to that shop and be
-- active (price/duration read fresh, never accepted as a parameter), the
-- requested time must be in the future and inside the shop's own opening
-- hours for that day (Asia/Kolkata — GLIDE launches single-city per Section
-- 13's go-to-market note, so one hardcoded timezone is a deliberate
-- simplification, not an oversight). Tuning numbers (hold/response/buffer)
-- are parameters, not hardcoded here a second time — the Edge Function
-- passes them from `supabase/functions/_shared/booking-logic.ts`, the one
-- place they're actually defined.
-- ---------------------------------------------------------------------------
create or replace function public.create_slot_booking(
  p_customer_id uuid,
  p_shop_id uuid,
  p_barber_id uuid,
  p_service_ids uuid[],
  p_scheduled_at timestamptz,
  p_hold_minutes integer,
  p_response_seconds integer,
  p_buffer_minutes integer
) returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop shops%rowtype;
  v_service_amount integer;
  v_duration_min integer;
  v_matched_count integer;
  v_ends_at timestamptz;
  v_booking bookings%rowtype;
  v_day_keys constant text[] := array['sun','mon','tue','wed','thu','fri','sat'];
  v_day_key text;
  v_day_hours jsonb;
  v_local_start time;
  v_local_end time;
begin
  if p_service_ids is null or array_length(p_service_ids, 1) is null then
    raise exception 'At least one service is required.' using errcode = 'GL003';
  end if;

  -- A slot booking's service list is a *set*, not a multiset — one instance
  -- of each service, no "2x Haircut" quantities (unlike the shop-detail
  -- screen's preview cart, which does support quantities for a price
  -- estimate before this point). De-duplicating here, not just trusting the
  -- Edge Function to have done it, matters for correctness: `WHERE id = ANY(...)`
  -- below matches each distinct service row once regardless of how many
  -- times its id appears in the array, so an un-deduplicated array would
  -- make `v_matched_count` come up short and wrongly reject a valid request.
  p_service_ids := (select array_agg(distinct x) from unnest(p_service_ids) as x);

  select * into v_shop from public.shops where id = p_shop_id;
  if not found or v_shop.status <> 'approved' or not v_shop.is_open then
    raise exception 'This shop is not currently accepting bookings.' using errcode = 'GL001';
  end if;

  if not exists (
    select 1 from public.barbers
    where id = p_barber_id and shop_id = p_shop_id and is_active
  ) then
    raise exception 'That barber is not available at this shop.' using errcode = 'GL002';
  end if;

  select coalesce(sum(price), 0), coalesce(sum(duration_min), 0), count(*)
    into v_service_amount, v_duration_min, v_matched_count
    from public.services
    where id = any(p_service_ids) and shop_id = p_shop_id and is_active;

  -- Every id in the request must resolve to a real, active service of this
  -- shop — if the count of matched rows is short, at least one id was
  -- foreign/inactive/typo'd rather than silently dropped from the total.
  if v_matched_count <> array_length(p_service_ids, 1) then
    raise exception 'One or more selected services are invalid.' using errcode = 'GL004';
  end if;

  if p_scheduled_at <= now() then
    raise exception 'That time has already passed.' using errcode = 'GL005';
  end if;

  v_ends_at := p_scheduled_at + make_interval(mins => v_duration_min + p_buffer_minutes);

  v_day_key := v_day_keys[extract(dow from (p_scheduled_at at time zone 'Asia/Kolkata'))::int + 1];
  v_day_hours := v_shop.opening_hours -> v_day_key;
  v_local_start := (p_scheduled_at at time zone 'Asia/Kolkata')::time;
  v_local_end := (v_ends_at at time zone 'Asia/Kolkata')::time;

  if v_day_hours is null or coalesce((v_day_hours ->> 'closed')::boolean, true) then
    raise exception 'This shop is closed that day.' using errcode = 'GL006';
  end if;

  -- `v_local_end < v_local_start` catches a booking whose service duration
  -- would carry it past midnight — not supported in this MVP pass, treated
  -- the same as running past closing time rather than a special case.
  if v_local_start < (v_day_hours ->> 'open')::time
     or v_local_end > (v_day_hours ->> 'close')::time
     or v_local_end < v_local_start then
    raise exception 'That time is outside the shop''s opening hours.' using errcode = 'GL007';
  end if;

  -- Two-step draft -> awaiting_shop, matching the state machine in
  -- booking-logic.ts exactly (and giving `booking_events` a genuine `draft`
  -- row, not a synthetic one) — both statements run inside this function's
  -- implicit transaction, so a caller never observes a booking stuck in
  -- `draft`. The exclusion constraint above guards the INSERT itself: if
  -- this collides with another live booking for the same barber, Postgres
  -- raises `23P01` here and the whole function aborts atomically — nothing
  -- is left half-created.
  insert into public.bookings (
    customer_id, shop_id, barber_id, status,
    scheduled_at, ends_at, service_amount, total_amount,
    slot_hold_expires_at, shop_response_expires_at
  ) values (
    p_customer_id, p_shop_id, p_barber_id, 'draft',
    p_scheduled_at, v_ends_at, v_service_amount, v_service_amount,
    now() + make_interval(mins => p_hold_minutes),
    now() + make_interval(secs => p_response_seconds)
  ) returning * into v_booking;

  update public.bookings
  set status = 'awaiting_shop'
  where id = v_booking.id
  returning * into v_booking;

  insert into public.booking_services (booking_id, service_id, price)
  select v_booking.id, s.id, s.price
  from public.services s
  where s.id = any(p_service_ids) and s.shop_id = p_shop_id;

  insert into public.booking_events (booking_id, status, actor_id, note)
  values
    (v_booking.id, 'draft', p_customer_id, 'Booking created'),
    (v_booking.id, 'awaiting_shop', p_customer_id, 'Awaiting shop response');

  return v_booking;
end;
$$;

revoke all on function public.create_slot_booking from public;
grant execute on function public.create_slot_booking to service_role;

-- ---------------------------------------------------------------------------
-- accept_booking / reject_booking — called only from `accept-booking` /
-- `reject-booking`. Ownership and valid-state-to-transition-from are both
-- enforced in the single atomic UPDATE's WHERE clause — not as a separate
-- SELECT check beforehand, which would leave a gap between "checked" and
-- "acted on" for two shop staff (or a race with the expiry sweep) to land in.
-- ---------------------------------------------------------------------------
create or replace function public.accept_booking(p_booking_id uuid, p_actor_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
begin
  update public.bookings b
  set status = 'confirmed', confirmed_at = now()
  where b.id = p_booking_id
    and b.status = 'awaiting_shop'
    and b.shop_response_expires_at > now()
    and exists (select 1 from public.shops s where s.id = b.shop_id and s.owner_id = p_actor_id)
  returning * into v_booking;

  if not found then
    raise exception 'This booking can no longer be accepted (already resolved, expired, or not yours).'
      using errcode = 'GL010';
  end if;

  insert into public.booking_events (booking_id, status, actor_id, note)
  values (v_booking.id, 'confirmed', p_actor_id, 'Shop accepted');

  return v_booking;
end;
$$;

revoke all on function public.accept_booking from public;
grant execute on function public.accept_booking to service_role;

create or replace function public.reject_booking(p_booking_id uuid, p_actor_id uuid, p_note text default null)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
begin
  update public.bookings b
  set status = 'rejected'
  where b.id = p_booking_id
    and b.status = 'awaiting_shop'
    and exists (select 1 from public.shops s where s.id = b.shop_id and s.owner_id = p_actor_id)
  returning * into v_booking;

  if not found then
    raise exception 'This booking can no longer be rejected (already resolved, expired, or not yours).'
      using errcode = 'GL011';
  end if;

  insert into public.booking_events (booking_id, status, actor_id, note)
  values (v_booking.id, 'rejected', p_actor_id, coalesce(nullif(trim(p_note), ''), 'Shop rejected'));

  return v_booking;
end;
$$;

revoke all on function public.reject_booking from public;
grant execute on function public.reject_booking to service_role;

-- ---------------------------------------------------------------------------
-- expire_stale_bookings — the "simple polling check for now" CLAUDE.md's
-- Phase 4 build list explicitly allows in place of pg_cron. Called from the
-- `expire-bookings` Edge Function, itself invoked opportunistically by the
-- customer/partner booking-list screens on load rather than on a fixed
-- schedule — acceptable per the doc's own wording, revisit with real pg_cron
-- once idle shops (nobody polling) need to expire without anyone watching.
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.bookings
    set status = 'expired'
    where status = 'awaiting_shop'
      and shop_response_expires_at <= now()
    returning id
  )
  insert into public.booking_events (booking_id, status, actor_id, note)
  select id, 'expired', null, 'Shop did not respond in time'
  from expired;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_stale_bookings from public;
grant execute on function public.expire_stale_bookings to service_role;
