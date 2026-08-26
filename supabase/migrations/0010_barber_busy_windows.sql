-- A privacy-safe way for the slot picker to grey out times a barber is
-- already booked, without exposing whose booking it is.
--
-- `bookings`' own RLS only lets a customer read their *own* rows — correct,
-- and not something to weaken. This view sidesteps that cleanly instead:
-- created as `postgres` (a plain view's query runs as its owner by default,
-- not the caller, unless `security_invoker` is set), so it can see every
-- live booking's timing, but only ever exposes `barber_id`/`scheduled_at`/
-- `ends_at` — no customer_id, no shop_id, no service info. Anyone
-- authenticated can query it; there's simply nothing identifying in it to
-- protect.
create view public.barber_busy_windows as
select barber_id, scheduled_at, ends_at
from public.bookings
where status in ('draft', 'awaiting_shop', 'confirmed');

grant select on public.barber_busy_windows to authenticated;
