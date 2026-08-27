/**
 * Pure booking business logic — the state machine and slot-overlap math.
 *
 * Deliberately framework-free (no Deno-only or Node-only APIs) so this one
 * file can be imported from three places without drift: the `create-booking`/
 * `accept-booking`/`reject-booking` Edge Functions (Deno), the Expo app
 * (`features/bookings/`, for client-side slot generation/preview), and the
 * Jest unit tests (Node) that CLAUDE.md's testing strategy requires from
 * Phase 4 onward. The database is still the actual source of truth for
 * collision-safety (see migration 0007's exclusion constraint) — this module
 * is what every caller uses to reason about the same rules consistently, not
 * a replacement for the DB-level guarantee.
 */

export type BookingStatus = 'draft' | 'awaiting_shop' | 'payment_pending' | 'confirmed' | 'rejected' | 'expired';

// Phase 4 tuning constants (CLAUDE.md Section 13's ground-reality backlog
// calls these "confirm with the builder" — confirmed: 100s response window,
// 5 min buffer). Passed explicitly into the DB functions as arguments rather
// than hardcoded a second time in SQL, so this file stays the one place that
// defines them.
export const SLOT_HOLD_MINUTES = 10;
export const SHOP_RESPONSE_SECONDS = 100;
export const BOOKING_BUFFER_MINUTES = 5;

/**
 * The only valid forward transitions for a slot booking. As of Phase 5, a
 * shop accepting moves a booking to `payment_pending`, not straight to
 * `confirmed` — only a captured payment (the Razorpay webhook) can do that.
 * `confirmed`/`rejected`/`expired` are terminal *for this phase* — Phase 6
 * adds `customer_arrived` etc. on top of `confirmed`, which will extend this
 * map then, not now (CLAUDE.md Section 2, rule 9).
 */
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  draft: ['awaiting_shop'],
  awaiting_shop: ['payment_pending', 'rejected', 'expired'],
  payment_pending: ['confirmed', 'expired'],
  confirmed: [],
  rejected: [],
  expired: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Throws with a message safe to surface to a client if `from -> to` isn't a
 * legal step — e.g. rejects a `draft -> confirmed` jump that skips
 * `awaiting_shop` entirely. Edge Functions call this before attempting the
 * DB update as defense in depth; the atomic `UPDATE ... WHERE status = ...`
 * in the SQL function is what actually holds under concurrency, this is what
 * turns an illegal request into a clear error instead of a silent no-op.
 */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Cannot move a booking from "${from}" to "${to}".`);
  }
}

export type TimeRange = { start: Date; end: Date };

/** Half-open interval overlap check: [aStart, aEnd) intersects [bStart, bEnd). */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * The exact occupied window a booking blocks for its barber — the service
 * duration plus a fixed buffer, so back-to-back bookings for the same barber
 * never butt together with zero gap (CLAUDE.md Section 13's Phase 4 note).
 */
export function computeBookingWindow(
  scheduledAt: Date,
  totalDurationMin: number,
  bufferMin: number = BOOKING_BUFFER_MINUTES
): TimeRange {
  const start = scheduledAt;
  const end = new Date(start.getTime() + (totalDurationMin + bufferMin) * 60_000);
  return { start, end };
}

export type SelectedService = { id: string; price: number; duration_min: number };

/**
 * Sums price/duration for a `{ serviceId: quantity }` cart against the
 * shop's real service rows — used for the shop-detail screen's pre-booking
 * price *preview*, which does support "2x Head Massage"-style quantities.
 * The actual `create-booking` call is set-based, not multiset-based (one
 * instance of each service per slot booking, matching real salon-appointment
 * semantics and `create_slot_booking`'s SQL) — the booking screen collapses
 * this function's `serviceIds` down to a distinct set before submitting,
 * it doesn't send quantities through to the server.
 */
export function summarizeSelection(
  services: SelectedService[],
  selected: Record<string, number>
): { totalPrice: number; totalDurationMin: number; serviceIds: string[] } {
  let totalPrice = 0;
  let totalDurationMin = 0;
  const serviceIds: string[] = [];

  for (const service of services) {
    const qty = selected[service.id] ?? 0;
    if (qty <= 0) continue;
    totalPrice += service.price * qty;
    totalDurationMin += service.duration_min * qty;
    for (let i = 0; i < qty; i++) serviceIds.push(service.id);
  }

  return { totalPrice, totalDurationMin, serviceIds };
}
