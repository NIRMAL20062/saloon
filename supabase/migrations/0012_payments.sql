-- Phase 5: Payments (Razorpay).
--
-- The booking only becomes financially real after the shop accepts — this
-- migration changes `accept_booking` (0008) so accepting moves a booking to
-- `payment_pending` instead of straight to `confirmed`. The *only* thing
-- that can move it the rest of the way to `confirmed` is the Razorpay
-- webhook actually capturing a payment (`process_payment_webhook` below) —
-- never a client-side "payment succeeded" callback, which CLAUDE.md Section
-- 4.1/5 is explicit is a UI hint only, not a source of truth.

-- ---------------------------------------------------------------------------
-- bookings: widen status to include payment_pending, add payment tracking.
-- ---------------------------------------------------------------------------
alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('draft', 'awaiting_shop', 'payment_pending', 'confirmed', 'rejected', 'expired'));

-- `payment_status` stays a separate column from `status` on purpose
-- (CLAUDE.md Section 10: "never merged") — null until a payment attempt has
-- actually started (create-payment-order), independent of how many times a
-- payment is retried within the same booking's payment window.
alter table public.bookings add column payment_status text
  check (payment_status in ('created', 'pending', 'captured', 'failed'));

-- The payment-attempt deadline — same idea as `shop_response_expires_at`,
-- just for the "shop accepted, now pay" step. A failed/abandoned attempt
-- doesn't lose the slot immediately (the customer might just have fat-
-- fingered their card and wants to retry) — it stays retryable until this
-- passes, then the existing expiry sweep (extended below) releases it like
-- any other stale hold.
alter table public.bookings add column payment_expires_at timestamptz;

-- `payment_pending` bookings still occupy their barber's calendar — a
-- customer mid-checkout hasn't lost the slot to someone else yet. Rebuild
-- the exclusion constraint from 0008 to include it.
alter table public.bookings drop constraint bookings_no_barber_overlap;
alter table public.bookings
  add constraint bookings_no_barber_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(scheduled_at, ends_at, '[)') with &&
  )
  where (status in ('draft', 'awaiting_shop', 'payment_pending', 'confirmed'));

-- `barber_busy_windows` (migration 0010) drives the customer-facing slot
-- picker's grey-out logic and needs to match the exclusion constraint's
-- blocking-status set exactly — otherwise a `payment_pending` booking (which
-- genuinely occupies the barber's calendar, per the rebuilt constraint
-- above) would show as an available slot to another customer, who'd only
-- discover it's actually taken when `create-booking` rejects them.
create or replace view public.barber_busy_windows as
select barber_id, scheduled_at, ends_at
from public.bookings
where status in ('draft', 'awaiting_shop', 'payment_pending', 'confirmed');

-- ---------------------------------------------------------------------------
-- payments — one row per booking's payment attempt lifecycle (Phase 5 has no
-- partial/split payments, so `unique (booking_id)` is deliberate, not an
-- oversight: a booking gets at most one payments row, reused across retries
-- within its payment window).
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) unique,
  amount integer not null check (amount > 0), -- paise, always resolved server-side from bookings.total_amount
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique, -- filled only once a payment actually captures/fails against this order
  status text not null default 'created' check (status in ('created', 'pending', 'captured', 'failed')),
  method text,
  created_at timestamptz not null default now(),
  captured_at timestamptz
);

alter table public.payments enable row level security;
create index payments_booking_id_idx on public.payments (booking_id);

create policy "payments: readable by the booking's customer or shop"
  on public.payments for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = payments.booking_id
        and (
          b.customer_id = auth.uid()
          or exists (select 1 from public.shops s where s.id = b.shop_id and s.owner_id = auth.uid())
        )
    )
  );

-- No INSERT/UPDATE/DELETE policy — writes only via the security definer
-- functions below, called only from Edge Functions using the service role
-- (same posture as `bookings` in migration 0008).

-- ---------------------------------------------------------------------------
-- processed_webhook_events — the idempotency ledger CLAUDE.md Section 5.5
-- calls for: "each webhook records the external event id it has already
-- processed... and short-circuits on a repeat delivery." Razorpay's webhook
-- payload doesn't carry one single globally-unique delivery id in the body,
-- but a (payment id, event type) pair is stable and unique per real event —
-- a retried delivery of the same event always carries the same pair.
-- ---------------------------------------------------------------------------
create table public.processed_webhook_events (
  id uuid primary key default gen_random_uuid(),
  razorpay_payment_id text not null,
  event_type text not null,
  created_at timestamptz not null default now(),
  unique (razorpay_payment_id, event_type)
);

alter table public.processed_webhook_events enable row level security;
-- No policies at all — this table has nothing a client ever needs to read.

-- ---------------------------------------------------------------------------
-- accept_booking (0008) — redefined to move to `payment_pending` instead of
-- `confirmed`. `create or replace` keeps the same ownership/state-check
-- semantics from 0008, just changes the destination status and stamps the
-- payment window instead of `confirmed_at` (which now only gets set once a
-- payment actually captures).
-- ---------------------------------------------------------------------------
create or replace function public.accept_booking(p_booking_id uuid, p_actor_id uuid, p_payment_window_minutes integer)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
begin
  update public.bookings b
  set status = 'payment_pending',
      payment_expires_at = now() + make_interval(mins => p_payment_window_minutes)
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
  values (v_booking.id, 'payment_pending', p_actor_id, 'Shop accepted — awaiting payment');

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- begin_payment_order — called from `create-payment-order`. Re-verifies
-- ownership and that the booking is actually in a payable state server-side;
-- the amount it returns (`total_amount`, computed back in Phase 4) is what
-- the Edge Function asks Razorpay to charge — never a client-supplied figure
-- (CLAUDE.md Section 5.4).
-- ---------------------------------------------------------------------------
create or replace function public.begin_payment_order(p_booking_id uuid, p_customer_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
begin
  select * into v_booking from public.bookings
  where id = p_booking_id and customer_id = p_customer_id;

  if not found then
    raise exception 'Booking not found.' using errcode = 'GL020';
  end if;

  if v_booking.status <> 'payment_pending' then
    raise exception 'This booking is not awaiting payment.' using errcode = 'GL021';
  end if;

  if v_booking.payment_expires_at is null or v_booking.payment_expires_at <= now() then
    raise exception 'The payment window for this booking has expired.' using errcode = 'GL022';
  end if;

  return v_booking;
end;
$$;

revoke all on function public.begin_payment_order from public;
grant execute on function public.begin_payment_order to service_role;

-- ---------------------------------------------------------------------------
-- record_payment_order — persists a Razorpay order the Edge Function just
-- created. On a `unique (booking_id)` conflict (a retry after an earlier
-- failed attempt), this genuinely REPLACES the stored order id/amount with
-- the fresh one — a no-op "keep the old order" here would leave `payments`
-- pointing at a stale, already-failed Razorpay order while the client is
-- checking out against a brand new one, so the eventual webhook for the new
-- order would look up an order id this table never heard of and reject it.
-- The `where status <> 'captured'` guard is the one thing that must never
-- be overwritten this way: if a payment already captured (e.g. a race with
-- the webhook), this update is skipped and the existing captured row is
-- returned as-is instead.
-- ---------------------------------------------------------------------------
create or replace function public.record_payment_order(p_booking_id uuid, p_razorpay_order_id text, p_amount integer)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
begin
  insert into public.payments (booking_id, amount, razorpay_order_id, status)
  values (p_booking_id, p_amount, p_razorpay_order_id, 'created')
  on conflict (booking_id) do update
    set amount = excluded.amount,
        razorpay_order_id = excluded.razorpay_order_id,
        status = 'created'
    where public.payments.status <> 'captured'
  returning * into v_payment;

  if not found then
    -- The existing row was already captured (a race with the webhook) —
    -- the booking is already paid; return that row as-is rather than error.
    select * into v_payment from public.payments where booking_id = p_booking_id;
  end if;

  update public.bookings set payment_status = 'created' where id = p_booking_id and payment_status is null;

  return v_payment;
end;
$$;

revoke all on function public.record_payment_order from public;
grant execute on function public.record_payment_order to service_role;

-- ---------------------------------------------------------------------------
-- process_payment_webhook — the only path that can ever move a booking to
-- `confirmed`. Called only from `razorpay-webhook`, only after that function
-- has verified the Razorpay signature on the raw request body. Idempotent by
-- construction: the `processed_webhook_events` insert is the very first
-- statement, and `FOUND` being false after an `ON CONFLICT DO NOTHING` means
-- this exact event was already handled, so the function returns immediately
-- without touching `payments`/`bookings` a second time.
-- ---------------------------------------------------------------------------
create or replace function public.process_payment_webhook(
  p_event_type text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount integer,
  p_method text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
begin
  insert into public.processed_webhook_events (razorpay_payment_id, event_type)
  values (p_razorpay_payment_id, p_event_type)
  on conflict (razorpay_payment_id, event_type) do nothing;

  if not found then
    return; -- duplicate delivery of an event we've already processed
  end if;

  select * into v_payment from public.payments where razorpay_order_id = p_razorpay_order_id;
  if not found then
    raise exception 'Unknown Razorpay order.' using errcode = 'GL030';
  end if;

  -- Defense in depth beyond signature verification (CLAUDE.md Section 5.4):
  -- the amount actually charged must match what we asked Razorpay to charge.
  if p_amount <> v_payment.amount then
    raise exception 'Webhook amount does not match the order amount.' using errcode = 'GL031';
  end if;

  if p_event_type = 'payment.captured' then
    update public.payments
    set status = 'captured', razorpay_payment_id = p_razorpay_payment_id, method = p_method, captured_at = now()
    where id = v_payment.id and status <> 'captured';

    update public.bookings
    set status = 'confirmed', payment_status = 'captured', confirmed_at = now()
    where id = v_payment.booking_id and status = 'payment_pending';

    insert into public.booking_events (booking_id, status, actor_id, note)
    values (v_payment.booking_id, 'confirmed', null, 'Payment captured');

  elsif p_event_type = 'payment.failed' then
    update public.payments
    set status = 'failed', razorpay_payment_id = p_razorpay_payment_id, method = p_method
    where id = v_payment.id and status <> 'captured';

    update public.bookings
    set payment_status = 'failed'
    where id = v_payment.booking_id and status = 'payment_pending';
    -- `status` deliberately stays `payment_pending`, not moved to a failure
    -- state — the customer can retry within the same payment window rather
    -- than losing the slot on one declined card.

    insert into public.booking_events (booking_id, status, actor_id, note)
    values (v_payment.booking_id, 'payment_pending', null, 'Payment attempt failed');
  end if;
end;
$$;

revoke all on function public.process_payment_webhook from public;
grant execute on function public.process_payment_webhook to service_role;

-- ---------------------------------------------------------------------------
-- expire_stale_bookings (0008) — extended to also sweep payment_pending
-- bookings whose payment window has lapsed, same "simple polling check"
-- pattern as the shop-response sweep.
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
  -- `to_expire` captures each row's status BEFORE the update below runs —
  -- all CTEs in one WITH clause see the same initial snapshot, so this
  -- still holds the original 'awaiting_shop'/'payment_pending' value to
  -- build an accurate note from, unlike joining back against `bookings`
  -- after it's already been overwritten to 'expired'.
  with to_expire as (
    select id, status as prior_status
    from public.bookings
    where (status = 'awaiting_shop' and shop_response_expires_at <= now())
       or (status = 'payment_pending' and payment_expires_at <= now())
  ),
  updated as (
    update public.bookings b
    set status = 'expired'
    from to_expire t
    where b.id = t.id
    returning b.id
  )
  insert into public.booking_events (booking_id, status, actor_id, note)
  select t.id, 'expired', null,
    case when t.prior_status = 'payment_pending'
      then 'Expired — payment window lapsed'
      else 'Expired — shop did not respond in time'
    end
  from to_expire t;

  -- ROW_COUNT here reflects the outermost statement (the INSERT), which
  -- inserts exactly one event row per expired booking — same count either way.
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
