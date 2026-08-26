import type { BookingStatus } from '@/supabase/functions/_shared/booking-logic';
import { supabase } from '@/lib/supabase/client';

export type { BookingStatus };

export type BookingServiceLine = {
  service_id: string;
  price: number; // paise, snapshotted at booking time
  services: { name: string } | null;
};

export type BookingListItem = {
  id: string;
  status: BookingStatus;
  scheduled_at: string;
  ends_at: string;
  service_amount: number;
  total_amount: number;
  shop_response_expires_at: string;
  confirmed_at: string | null;
  created_at: string;
  shop_id: string;
  barber_id: string;
  shops: { name: string; address: string | null } | null;
  barbers: { name: string } | null;
  booking_services: BookingServiceLine[];
  /**
   * Only populated for the partner view, via a separate `booking_customer_profiles`
   * query (migration 0011) — deliberately NOT an embedded `profiles(...)` join.
   * `profiles` itself only grants a shop owner "read own row"; a broader
   * policy existed briefly (migration 0008) and was found to leak `phone`
   * beyond what the UI displays (RLS is row-scoped, not column-scoped), so
   * it was replaced with this narrow, two-column view instead of widening
   * table-level access again.
   */
  profiles: { full_name: string | null } | null;
};

const BOOKING_SELECT = `
  id, status, scheduled_at, ends_at, service_amount, total_amount,
  shop_response_expires_at, confirmed_at, created_at, shop_id, barber_id,
  shops ( name, address ),
  barbers ( name ),
  booking_services ( service_id, price, services ( name ) )
`;

/** RLS (migration 0008) already scopes this to the caller's own bookings. */
export async function fetchMyBookings(): Promise<BookingListItem[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((b) => ({ ...b, profiles: null })) as unknown as BookingListItem[];
}

/**
 * RLS (migration 0008) already scopes the booking rows themselves to shops
 * the caller owns. Customer names come from a second, narrow query against
 * `booking_customer_profiles` (migration 0011) rather than an embedded
 * `profiles(...)` join — see `BookingListItem.profiles`'s docstring for why.
 */
export async function fetchShopBookings(shopId: string): Promise<BookingListItem[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as BookingListItem[];
}

export type BusyWindow = { scheduled_at: string; ends_at: string };

/**
 * Reads `barber_busy_windows` (migration 0010) — a privacy-safe view with no
 * customer identity in it — so the slot picker can grey out times that are
 * actually taken instead of showing every generated slot as bookable and
 * only failing at submit time. Still just a UI improvement, not a new source
 * of truth: `create-booking` independently re-checks collision server-side
 * regardless of what this shows.
 */
export async function fetchBarberBusyWindows(barberId: string, dayStart: Date, dayEnd: Date): Promise<BusyWindow[]> {
  const { data, error } = await supabase
    .from('barber_busy_windows')
    .select('scheduled_at, ends_at')
    .eq('barber_id', barberId)
    .lt('scheduled_at', dayEnd.toISOString())
    .gt('ends_at', dayStart.toISOString());

  if (error) throw error;
  return data ?? [];
}

/** Lightweight count for a nav badge — avoids pulling the full booking list just to show a number. */
export async function countPendingBookings(shopId: string): Promise<number> {
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .eq('status', 'awaiting_shop');

  if (error) throw error;
  return count ?? 0;
}

export type CreateBookingInput = {
  shopId: string;
  barberId: string;
  serviceIds: string[];
  /** ISO timestamp — evaluated against the shop's schedule and existing bookings server-side, never trusted as "available" client-side. */
  scheduledAt: string;
};

/**
 * All the real decisions (price, duration, collision, opening hours) happen
 * server-side in `create-booking`/`create_slot_booking` — this is a thin,
 * typed wrapper, not where any of that logic lives (CLAUDE.md Section 4.1).
 */
export async function createBooking(input: CreateBookingInput): Promise<BookingListItem> {
  const { data, error } = await supabase.functions.invoke('create-booking', {
    body: {
      shop_id: input.shopId,
      barber_id: input.barberId,
      service_ids: input.serviceIds,
      scheduled_at: input.scheduledAt,
    },
  });

  if (error) throw new Error(await extractFunctionError(error));
  return data.booking as BookingListItem;
}

export async function acceptBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('accept-booking', {
    body: { booking_id: bookingId },
  });
  if (error) throw new Error(await extractFunctionError(error));
}

export async function rejectBooking(bookingId: string, note?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('reject-booking', {
    body: { booking_id: bookingId, note },
  });
  if (error) throw new Error(await extractFunctionError(error));
}

/**
 * The "simple polling check" side of Phase 4's expiry mechanism — called
 * opportunistically before a booking list loads (both the customer and
 * partner screens do this), not on a fixed schedule. Deliberately swallows
 * its own failure: a missed sweep just means a stale booking shows for one
 * more screen load, not a broken booking list (mirrors how Phase 11's
 * analytics calls are required to never surface as a user-facing error).
 */
export async function expireStaleBookings(): Promise<void> {
  try {
    await supabase.functions.invoke('expire-bookings', { body: {} });
  } catch (e) {
    console.warn('[bookings] expire sweep failed (non-fatal):', e instanceof Error ? e.message : e);
  }
}

/** The Supabase JS client's FunctionsHttpError body is the JSON `{ error }` the Edge Function returned. */
async function extractFunctionError(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json();
        if (typeof body?.error === 'string') return body.error;
      } catch {
        // fall through to the generic message below
      }
    }
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
