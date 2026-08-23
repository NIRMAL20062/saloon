-- One-off sample data for Phase 2 manual testing. Paste into the Supabase
-- SQL Editor and run once. This is DATA, not a schema change, so it lives
-- outside supabase/migrations/ and is not applied automatically (Claude-
-- Context.md Section 2, rule 12 — table/data edits are fine for seeding,
-- only structure changes must be migrations).
--
-- Uses whichever `partner`-role profile exists first as the owner — if
-- you've followed the dev-accounts setup, that's the dev-partner test
-- account, so no manual UUID lookup is needed.

with owner as (
  select id from public.profiles where role = 'partner' limit 1
)
insert into public.shops (owner_id, name, address, status, is_open, lat, lng)
select owner.id, v.name, v.address, 'approved', true, v.lat, v.lng
from owner, (values
  ('Sharp Cuts', '12 MG Road, Bengaluru', 12.9757, 77.6096),
  ('The Gentlemen''s Lounge', '45 Brigade Road, Bengaluru', 12.9698, 77.6083),
  ('Fade Factory', '9 Indiranagar 100ft Road, Bengaluru', 12.9784, 77.6408)
) as v(name, address, lat, lng);

insert into public.services (shop_id, name, price, duration_min)
select s.id, v.name, v.price, v.duration_min
from public.shops s
join (values
  ('Sharp Cuts', 'Haircut', 30000, 30),
  ('Sharp Cuts', 'Beard Trim', 15000, 15),
  ('The Gentlemen''s Lounge', 'Haircut', 40000, 40),
  ('The Gentlemen''s Lounge', 'Haircut + Beard', 60000, 60),
  ('Fade Factory', 'Skin Fade', 35000, 35)
) as v(shop_name, name, price, duration_min) on v.shop_name = s.name
where s.status = 'approved';

insert into public.barbers (shop_id, name)
select s.id, v.name
from public.shops s
join (values
  ('Sharp Cuts', 'Rakesh'),
  ('Sharp Cuts', 'Imran'),
  ('The Gentlemen''s Lounge', 'Vikram'),
  ('Fade Factory', 'Suresh')
) as v(shop_name, name) on v.shop_name = s.name
where s.status = 'approved';
