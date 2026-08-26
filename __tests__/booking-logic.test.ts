import {
  assertTransition,
  canTransition,
  computeBookingWindow,
  rangesOverlap,
  summarizeSelection,
  type BookingStatus,
} from '../supabase/functions/_shared/booking-logic';

describe('booking state machine', () => {
  it('allows every legal Phase 4 transition', () => {
    expect(canTransition('draft', 'awaiting_shop')).toBe(true);
    expect(canTransition('awaiting_shop', 'confirmed')).toBe(true);
    expect(canTransition('awaiting_shop', 'rejected')).toBe(true);
    expect(canTransition('awaiting_shop', 'expired')).toBe(true);
  });

  it('rejects a draft jumping straight to confirmed, skipping awaiting_shop', () => {
    expect(canTransition('draft', 'confirmed')).toBe(false);
  });

  it('rejects every transition out of a terminal status', () => {
    const terminal: BookingStatus[] = ['confirmed', 'rejected', 'expired'];
    for (const from of terminal) {
      expect(canTransition(from, 'awaiting_shop')).toBe(false);
      expect(canTransition(from, 'confirmed')).toBe(false);
    }
  });

  it('rejects a booking going "backwards" from confirmed to awaiting_shop', () => {
    expect(canTransition('confirmed', 'awaiting_shop')).toBe(false);
  });

  it('assertTransition throws a clear error on an illegal jump, and nothing on a legal one', () => {
    expect(() => assertTransition('draft', 'confirmed')).toThrow(/cannot move/i);
    expect(() => assertTransition('awaiting_shop', 'confirmed')).not.toThrow();
  });
});

describe('slot-overlap math', () => {
  it('flags two bookings for the same barber that overlap in time', () => {
    const bookingA = computeBookingWindow(new Date('2026-01-05T10:00:00Z'), 30);
    // Starts 20 minutes into A's 30+5min buffer window — should collide.
    const bookingB = computeBookingWindow(new Date('2026-01-05T10:20:00Z'), 30);
    expect(rangesOverlap(bookingA, bookingB)).toBe(true);
  });

  it('lets exactly one of two overlapping requests for the same slot succeed', () => {
    // Simulates the "two customers race for the same barber+time" scenario
    // CLAUDE.md Phase 4 calls for — the actual atomicity guarantee is the
    // DB's exclusion constraint (migration 0007), but the pure overlap
    // predicate both the DB logic and this test are built on is what's
    // verified here: exactly one of two identical requests should be
    // considered valid against an empty slate, and the second must collide
    // with whichever "wins" first.
    const requestedWindow = computeBookingWindow(new Date('2026-01-05T14:00:00Z'), 45);
    const alreadyBooked: { start: Date; end: Date }[] = [];

    function tryBook(window: { start: Date; end: Date }) {
      const collides = alreadyBooked.some((existing) => rangesOverlap(existing, window));
      if (collides) return false;
      alreadyBooked.push(window);
      return true;
    }

    const firstAccepted = tryBook(requestedWindow);
    const secondAccepted = tryBook(requestedWindow);

    expect(firstAccepted).toBe(true);
    expect(secondAccepted).toBe(false);
    expect(alreadyBooked).toHaveLength(1);
  });

  it('respects the buffer between back-to-back bookings for the same barber', () => {
    // A 30-min service starting at 10:00 with a 5-min buffer occupies
    // [10:00, 10:35). A second booking starting exactly at 10:30 (inside the
    // buffer) must collide; one starting at 10:35 (right at the buffer's
    // edge) must not, since the half-open interval excludes the end instant.
    const first = computeBookingWindow(new Date('2026-01-05T10:00:00Z'), 30, 5);
    const duringBuffer = computeBookingWindow(new Date('2026-01-05T10:30:00Z'), 30, 5);
    const afterBuffer = computeBookingWindow(new Date('2026-01-05T10:35:00Z'), 30, 5);

    expect(rangesOverlap(first, duringBuffer)).toBe(true);
    expect(rangesOverlap(first, afterBuffer)).toBe(false);
  });

  it('does not flag two non-overlapping bookings later in the day', () => {
    const morning = computeBookingWindow(new Date('2026-01-05T09:00:00Z'), 30);
    const afternoon = computeBookingWindow(new Date('2026-01-05T15:00:00Z'), 30);
    expect(rangesOverlap(morning, afternoon)).toBe(false);
  });
});

describe('summarizeSelection', () => {
  const services = [
    { id: 'haircut', price: 30000, duration_min: 30 },
    { id: 'beard', price: 15000, duration_min: 15 },
  ];

  it('sums price and duration only for selected services, ignoring zero/absent quantities', () => {
    const result = summarizeSelection(services, { haircut: 1, beard: 0 });
    expect(result.totalPrice).toBe(30000);
    expect(result.totalDurationMin).toBe(30);
    expect(result.serviceIds).toEqual(['haircut']);
  });

  it('multiplies by quantity for a repeated service', () => {
    const result = summarizeSelection(services, { haircut: 1, beard: 2 });
    expect(result.totalPrice).toBe(30000 + 15000 * 2);
    expect(result.totalDurationMin).toBe(30 + 15 * 2);
    expect(result.serviceIds).toEqual(['haircut', 'beard', 'beard']);
  });

  it('ignores a quantity for a service id that is not in the shop catalog', () => {
    const result = summarizeSelection(services, { 'not-a-real-service': 3 });
    expect(result.totalPrice).toBe(0);
    expect(result.serviceIds).toEqual([]);
  });
});
