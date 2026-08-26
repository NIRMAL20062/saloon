-- Phase 4 prep: give `shops.opening_hours` a real default instead of `{}`.
--
-- Phase 3 shipped the opening-hours editor (features/shops/partner-api.ts's
-- `withOpeningHoursDefaults`), but a shop that hasn't explicitly opened that
-- card and hit "Save hours" yet still has the bare `{}` the column has
-- defaulted to since Phase 1's migration. Phase 4's slot-booking availability
-- check (migration 0008) reads `opening_hours` to decide whether a requested
-- time falls inside the shop's schedule — reading `{}` would mean "closed
-- every day of the week" for every shop that hasn't touched this card yet,
-- silently blocking all bookings for shops nobody has misconfigured, just
-- never explicitly saved. Backfilling to the same 09:00-20:00-every-day
-- default the Phase 3 editor already *shows* (but doesn't persist until
-- Save) means the DB and the UI finally agree on what's actually stored.

update public.shops
set opening_hours = '{
  "mon": {"closed": false, "open": "09:00", "close": "20:00"},
  "tue": {"closed": false, "open": "09:00", "close": "20:00"},
  "wed": {"closed": false, "open": "09:00", "close": "20:00"},
  "thu": {"closed": false, "open": "09:00", "close": "20:00"},
  "fri": {"closed": false, "open": "09:00", "close": "20:00"},
  "sat": {"closed": false, "open": "09:00", "close": "20:00"},
  "sun": {"closed": false, "open": "09:00", "close": "20:00"}
}'::jsonb
where opening_hours = '{}'::jsonb;

alter table public.shops
  alter column opening_hours set default '{
    "mon": {"closed": false, "open": "09:00", "close": "20:00"},
    "tue": {"closed": false, "open": "09:00", "close": "20:00"},
    "wed": {"closed": false, "open": "09:00", "close": "20:00"},
    "thu": {"closed": false, "open": "09:00", "close": "20:00"},
    "fri": {"closed": false, "open": "09:00", "close": "20:00"},
    "sat": {"closed": false, "open": "09:00", "close": "20:00"},
    "sun": {"closed": false, "open": "09:00", "close": "20:00"}
  }'::jsonb;
