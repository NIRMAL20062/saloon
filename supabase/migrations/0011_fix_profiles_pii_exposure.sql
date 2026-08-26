-- Security fix: 0008's "shop owner reads their bookings' customers' profiles"
-- policy was row-scoped only, which in Postgres RLS means column-unscoped —
-- it let a shop owner's real session read a customer's `phone` (and any
-- other profiles column) directly via the REST API, not just the `full_name`
-- the app's own UI happens to display. RLS restricts which *rows* a policy
-- allows; it cannot restrict which *columns* within an allowed row are
-- readable, and nothing else in the schema narrows this with a column-level
-- GRANT. Confirmed via adversarial security review, not merely theoretical:
-- `{url}/rest/v1/profiles?select=phone&id=eq.<customer_id>` was directly
-- reachable with a legitimate partner JWT.
--
-- Fix: replace the broad table policy with a narrow view exposing only the
-- two display-safe columns a shop legitimately needs (who booked, so they
-- can recognize the customer) — mirrors the `barber_busy_windows` pattern
-- (migration 0010) of "expose a purpose-built, minimal view instead of
-- widening access to the sensitive base table."
drop policy "profiles: shop owner reads profiles of their bookings' customers" on public.profiles;

create view public.booking_customer_profiles as
select b.id as booking_id, p.full_name, p.photo_url
from public.bookings b
join public.profiles p on p.id = b.customer_id
join public.shops s on s.id = b.shop_id
where s.owner_id = auth.uid();

grant select on public.booking_customer_profiles to authenticated;
