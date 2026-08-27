-- Resolves Supabase's Security Advisor "Security Definer View" (CRITICAL)
-- findings on `barber_busy_windows` (0010) and `booking_customer_profiles`
-- (0011).
--
-- Both views were deliberately built to read past RLS on their base tables
-- (a plain `CREATE VIEW` runs as its owner, not the querying user, unless
-- `security_invoker` is set) — that bypass was the whole point, with the
-- actual access control done differently in each: `barber_busy_windows`
-- never exposes an identifying column at all, and `booking_customer_profiles`
-- carries its own `auth.uid()` check in the query body. Both are genuinely
-- safe as designed. But a bare SECURITY DEFINER *view* is exactly the
-- pattern Supabase's linter (rightly, as a general rule) flags, because nine
-- times out of ten it's an accident, not a deliberate narrow carve-out — and
-- a view can't scope *what* it exposes as precisely as a function's
-- explicit parameter list can. Converting both to SECURITY DEFINER
-- functions is Supabase's own recommended fix for this advisory, keeps the
-- identical access-control properties, and matches the pattern every other
-- privileged operation in this schema already uses (migrations 0008/0012).
drop view public.barber_busy_windows;
drop view public.booking_customer_profiles;

create or replace function public.get_barber_busy_windows(
  p_barber_id uuid,
  p_day_start timestamptz,
  p_day_end timestamptz
) returns table (scheduled_at timestamptz, ends_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select b.scheduled_at, b.ends_at
  from public.bookings b
  where b.barber_id = p_barber_id
    and b.status in ('draft', 'awaiting_shop', 'payment_pending', 'confirmed')
    and b.scheduled_at < p_day_end
    and b.ends_at > p_day_start;
$$;

revoke all on function public.get_barber_busy_windows from public;
grant execute on function public.get_barber_busy_windows to authenticated;

create or replace function public.get_booking_customer_profiles(p_booking_ids uuid[])
returns table (booking_id uuid, full_name text, photo_url text)
language sql
security definer
set search_path = public
as $$
  select b.id as booking_id, p.full_name, p.photo_url
  from public.bookings b
  join public.profiles p on p.id = b.customer_id
  join public.shops s on s.id = b.shop_id
  where s.owner_id = auth.uid()
    and b.id = any(p_booking_ids);
$$;

revoke all on function public.get_booking_customer_profiles from public;
grant execute on function public.get_booking_customer_profiles to authenticated;
