-- Phase 1: profiles, shops, services, barbers.
--
-- RLS is enabled on every table in the same migration that creates it
-- (Claude-Context.md Section 2, rule 11). `shops`/`services`/`barbers` get
-- NO policies yet, on purpose: RLS enabled + zero policies means nobody can
-- read or write them from the client at all until Phase 2 (public read) and
-- Phase 3 (owner write) add the real policies. That locked-down state is the
-- correct thing to ship now, not a gap to "temporarily" work around.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'partner', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  full_name text,
  photo_url text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own row"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own row"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Shops / services / barbers are created now with their end-state shape
-- (Section 10 of Claude-Context.md) so nothing needs renaming later, but are
-- only populated/used starting Phase 2/3.

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  opening_hours jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- 'pending' | 'approved' — see Phase 3 / Phase 12
  is_open boolean not null default true,
  commission_pct numeric(5, 2) not null default 10.00,
  created_at timestamptz not null default now()
);

alter table public.shops enable row level security;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  price integer not null check (price > 0), -- integer paise — see Claude-Context.md Section 10
  duration_min integer not null check (duration_min > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.barbers enable row level security;

create index shops_owner_id_idx on public.shops (owner_id);
create index services_shop_id_idx on public.services (shop_id);
create index barbers_shop_id_idx on public.barbers (shop_id);
