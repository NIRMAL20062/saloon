import { supabase } from '@/lib/supabase/client';

import type { Coordinates } from '@/features/shops/geo';

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type DayHours = { closed: boolean; open: string; close: string };
export type OpeningHours = Record<DayKey, DayHours>;

const DEFAULT_DAY_HOURS: DayHours = { closed: false, open: '09:00', close: '20:00' };

/** `shops.opening_hours` defaults to `{}` in the schema — fill in any missing day with a sane default. */
export function withOpeningHoursDefaults(raw: unknown): OpeningHours {
  const parsed = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as Partial<
    Record<DayKey, Partial<DayHours>>
  >;
  const result = {} as OpeningHours;
  for (const day of DAY_KEYS) {
    const entry = parsed[day];
    result[day] = {
      closed: entry?.closed ?? DEFAULT_DAY_HOURS.closed,
      open: entry?.open ?? DEFAULT_DAY_HOURS.open,
      close: entry?.close ?? DEFAULT_DAY_HOURS.close,
    };
  }
  return result;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type OpeningHoursFieldErrors = Partial<Record<DayKey, string>>;

/** Field-level validation for live feedback, mirroring `validateServiceInput`'s pattern. */
export function validateOpeningHours(hours: OpeningHours): OpeningHoursFieldErrors {
  const errors: OpeningHoursFieldErrors = {};
  for (const day of DAY_KEYS) {
    const { closed, open, close } = hours[day];
    if (closed) continue;
    if (!HHMM.test(open) || !HHMM.test(close)) {
      errors[day] = 'Use 24-hour HH:MM, e.g. 09:00.';
    } else if (open >= close) {
      errors[day] = 'Opening time must be before closing time.';
    }
  }
  return errors;
}

export type OwnShop = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  status: 'pending' | 'approved';
  is_open: boolean;
  opening_hours: OpeningHours;
};

const OWN_SHOP_COLUMNS = 'id, owner_id, name, address, lat, lng, status, is_open, opening_hours';

/**
 * Migration 0003's owner-read policy lets a partner read their own shop row
 * regardless of `status` — 0002's public policy only shows `approved` shops,
 * which would otherwise hide a brand-new shop from its own owner before an
 * admin approves it (Phase 12). `.order(...).limit(1)` instead of a bare
 * `.maybeSingle()` on `owner_id` alone is defensive: the schema doesn't
 * enforce one shop per owner (a future multi-location owner is plausible),
 * so this always resolves to *a* shop rather than throwing if that ever
 * changes — Phase 3's UI only manages a single shop per partner for now.
 */
export async function fetchOwnShop(ownerId: string): Promise<OwnShop | null> {
  const { data, error } = await supabase
    .from('shops')
    .select(OWN_SHOP_COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { ...data, opening_hours: withOpeningHoursDefaults(data.opening_hours) };
}

export type CreateShopInput = {
  ownerId: string;
  name: string;
  address: string;
  coordinates: Coordinates | null;
};

/**
 * `status` and `commission_pct` are deliberately absent from this payload —
 * migration 0003's trigger overrides them regardless, but not sending them
 * keeps the client code honest about what it actually controls.
 */
export async function createShop(input: CreateShopInput): Promise<OwnShop> {
  const { data, error } = await supabase
    .from('shops')
    .insert({
      owner_id: input.ownerId,
      name: input.name.trim(),
      address: input.address.trim() || null,
      lat: input.coordinates?.lat ?? null,
      lng: input.coordinates?.lng ?? null,
    })
    .select(OWN_SHOP_COLUMNS)
    .single();

  if (error) throw error;
  return { ...data, opening_hours: withOpeningHoursDefaults(data.opening_hours) };
}

export type ShopProfilePatch = {
  name: string;
  address: string;
  coordinates: Coordinates | null;
};

export async function updateShopProfile(shopId: string, patch: ShopProfilePatch): Promise<void> {
  const { error } = await supabase
    .from('shops')
    .update({
      name: patch.name.trim(),
      address: patch.address.trim() || null,
      lat: patch.coordinates?.lat ?? null,
      lng: patch.coordinates?.lng ?? null,
    })
    .eq('id', shopId);

  if (error) throw error;
}

/**
 * Split out from `updateShopProfile` on purpose: this is the "emergency
 * pause" toggle (CLAUDE.md Section 13, Phase 3 note) — a shop owner flipping
 * it during a power cut or a fully-booked afternoon shouldn't have to touch
 * the rest of the profile form to do it, and the UI calls this directly the
 * moment the switch moves, not behind a separate "Save" button.
 */
export async function setShopOpen(shopId: string, isOpen: boolean): Promise<void> {
  const { error } = await supabase.from('shops').update({ is_open: isOpen }).eq('id', shopId);
  if (error) throw error;
}

/**
 * Separate from `is_open` on purpose — `opening_hours` is the shop's
 * *schedule* (what days/times it normally runs), while `is_open` is the
 * one-tap emergency pause on top of that schedule. Conflating them would
 * mean a partner editing next week's Tuesday close time could accidentally
 * flip whether the shop is accepting bookings right now.
 */
export async function updateOpeningHours(shopId: string, hours: OpeningHours): Promise<void> {
  const errors = validateOpeningHours(hours);
  if (Object.keys(errors).length > 0) {
    throw new Error('Fix the highlighted opening hours before saving.');
  }
  const { error } = await supabase.from('shops').update({ opening_hours: hours }).eq('id', shopId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Services CRUD (Phase 3, slice 2)
// ---------------------------------------------------------------------------

export type OwnService = {
  id: string;
  shop_id: string;
  name: string;
  price: number; // integer paise — see CLAUDE.md Section 10
  duration_min: number;
  is_active: boolean;
};

const OWN_SERVICE_COLUMNS = 'id, shop_id, name, price, duration_min, is_active';

/**
 * Unlike the customer-facing `fetchShopDetail` in `api.ts`, this deliberately
 * does NOT filter on `is_active` — an owner needs to see (and re-activate) a
 * service they previously turned off, not just the ones currently visible to
 * customers.
 */
export async function fetchOwnServices(shopId: string): Promise<OwnService[]> {
  const { data, error } = await supabase
    .from('services')
    .select(OWN_SERVICE_COLUMNS)
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Raw form strings, not parsed numbers — validation happens in `parseServiceInput`. */
export type ServiceFormInput = {
  name: string;
  priceRupees: string;
  durationMin: string;
};

/**
 * Client-side half of the "Postgres-level input validation on service
 * price/duration" requirement (CLAUDE.md Phase 3 build list) — the database
 * CHECK constraints (migration 0001: `price > 0`, `duration_min > 0`;
 * migration 0004: `duration_min <= 480`) are what actually can't be bypassed,
 * this just turns a typo into a clear message instead of a raw Postgres
 * error. Price is entered in rupees (what a shop owner thinks in) and stored
 * in paise (what the schema/Razorpay expect).
 */
function parseServiceInput(input: ServiceFormInput): { name: string; price: number; duration_min: number } {
  const name = input.name.trim();
  if (!name) throw new Error('Service name is required.');

  const price = Math.round(Number(input.priceRupees) * 100);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Price must be a positive amount.');
  }

  const duration_min = Math.round(Number(input.durationMin));
  if (!Number.isFinite(duration_min) || duration_min <= 0) {
    throw new Error('Duration must be a positive number of minutes.');
  }
  if (duration_min > 480) {
    throw new Error("Duration can't be more than 480 minutes (8 hours).");
  }

  return { name, price, duration_min };
}

export type ServiceFieldErrors = {
  name?: string;
  priceRupees?: string;
  durationMin?: string;
};

/**
 * Field-level validation for live `onChangeText` feedback
 * (docs/UX_EXPERIENCE.md's "Inline validation on service price/duration") —
 * returns a message per invalid field instead of throwing on the first
 * problem, so the form can flag every bad field at once. An empty field
 * isn't flagged here (that would yell "required" before the user's typed
 * anything); `parseServiceInput`, run on submit, is what actually enforces
 * "required."
 */
export function validateServiceInput(input: ServiceFormInput): ServiceFieldErrors {
  const errors: ServiceFieldErrors = {};

  if (input.priceRupees.trim()) {
    const price = Math.round(Number(input.priceRupees) * 100);
    if (!Number.isFinite(price) || price <= 0) errors.priceRupees = 'Enter a positive price.';
  }

  if (input.durationMin.trim()) {
    const duration = Math.round(Number(input.durationMin));
    if (!Number.isFinite(duration) || duration <= 0) {
      errors.durationMin = 'Enter a positive number of minutes.';
    } else if (duration > 480) {
      errors.durationMin = "Can't be more than 480 min (8 hours).";
    }
  }

  return errors;
}

export async function createService(shopId: string, input: ServiceFormInput): Promise<OwnService> {
  const parsed = parseServiceInput(input);
  const { data, error } = await supabase
    .from('services')
    .insert({ shop_id: shopId, ...parsed })
    .select(OWN_SERVICE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateService(serviceId: string, input: ServiceFormInput): Promise<void> {
  const parsed = parseServiceInput(input);
  const { error } = await supabase.from('services').update(parsed).eq('id', serviceId);
  if (error) throw error;
}

/**
 * The "delete" a partner actually gets in the UI — see migration 0004 for
 * why there's no real DELETE policy yet. Toggled directly on the list, same
 * pattern as `setShopOpen`.
 */
export async function setServiceActive(serviceId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('services').update({ is_active: isActive }).eq('id', serviceId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Barbers CRUD (Phase 3, slice 3)
// ---------------------------------------------------------------------------

export type OwnBarber = {
  id: string;
  shop_id: string;
  name: string;
  is_active: boolean;
};

const OWN_BARBER_COLUMNS = 'id, shop_id, name, is_active';

export async function fetchOwnBarbers(shopId: string): Promise<OwnBarber[]> {
  const { data, error } = await supabase
    .from('barbers')
    .select(OWN_BARBER_COLUMNS)
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createBarber(shopId: string, name: string): Promise<OwnBarber> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Barber name is required.');
  const { data, error } = await supabase
    .from('barbers')
    .insert({ shop_id: shopId, name: trimmed })
    .select(OWN_BARBER_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateBarber(barberId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Barber name is required.');
  const { error } = await supabase.from('barbers').update({ name: trimmed }).eq('id', barberId);
  if (error) throw error;
}

export async function setBarberActive(barberId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('barbers').update({ is_active: isActive }).eq('id', barberId);
  if (error) throw error;
}

