import type { DayOption, TimeSlot } from '@/components/slot-picker';
import type { BusyWindow } from '@/features/bookings/api';
import type { DayKey, OpeningHours } from '@/features/shops/partner-api';

const DAY_KEY_BY_JS_DAY: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SLOT_INTERVAL_MINUTES = 30;
// Small safety margin so a slot generated as "available" doesn't immediately
// fail the server's `scheduled_at must be in the future` check by the time
// the request round-trips.
const MIN_LEAD_MINUTES = 5;

/**
 * Client-side slot generation for the picker's *display* only — this is a
 * preview, never the source of truth. The server (`create_slot_booking`)
 * independently re-derives opening hours and collision state and is the only
 * thing that actually decides whether a slot is bookable (CLAUDE.md Section
 * 4.1: "never trust the client's 'this slot looks free'"). `buildTimeSlots`
 * greys out slots that overlap a known busy window (from the privacy-safe
 * `barber_busy_windows` view, migration 0010) as a UX nicety — but a slot
 * can still get rejected server-side (e.g. someone else just took it a
 * moment ago), which the booking screen already handles gracefully.
 *
 * Local device time is used directly, not converted to Asia/Kolkata — a
 * deliberate simplification matching this MVP's single-city (Bengaluru)
 * launch (CLAUDE.md Section 13's go-to-market note), where a real user's
 * phone is already in that timezone. The server explicitly evaluates against
 * Asia/Kolkata regardless of what the client sends, so this only affects the
 * picker's own display accuracy, never the actual booking guarantee.
 */
export function buildDayOptions(daysAhead = 7): DayOption[] {
  const days: DayOption[] = [];
  const now = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);

    const dateString = toDateKey(date);
    const dayName =
      i === 0 ? 'TODAY' : i === 1 ? 'TOMORROW' : date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
    const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    days.push({ dateString, dayName, dateLabel });
  }

  return days;
}

export function buildTimeSlots(
  dateString: string,
  openingHours: OpeningHours,
  totalDurationMin: number,
  bufferMin: number,
  busyWindows: BusyWindow[] = []
): TimeSlot[] {
  const date = fromDateKey(dateString);
  const dayKey = DAY_KEY_BY_JS_DAY[date.getDay()];
  const hours = openingHours[dayKey];

  if (!hours || hours.closed || totalDurationMin <= 0) return [];

  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  if ([openH, openM, closeH, closeM].some(Number.isNaN)) return [];

  const dayStart = new Date(date);
  dayStart.setHours(openH, openM, 0, 0);
  const dayClose = new Date(date);
  dayClose.setHours(closeH, closeM, 0, 0);

  const lastStart = new Date(dayClose.getTime() - (totalDurationMin + bufferMin) * 60_000);
  const earliestStart = new Date(Date.now() + MIN_LEAD_MINUTES * 60_000);
  const busy = busyWindows.map((w) => ({ start: new Date(w.scheduled_at), end: new Date(w.ends_at) }));

  const slots: TimeSlot[] = [];
  for (let t = new Date(dayStart); t <= lastStart; t = new Date(t.getTime() + SLOT_INTERVAL_MINUTES * 60_000)) {
    if (t < earliestStart) continue;
    const slotEnd = new Date(t.getTime() + (totalDurationMin + bufferMin) * 60_000);
    const isAvailable = !busy.some((w) => t < w.end && w.start < slotEnd);

    const hour = t.getHours();
    const period: TimeSlot['period'] = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    slots.push({
      id: t.toISOString(),
      timeLabel: t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      period,
      isAvailable,
    });
  }

  return slots;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromDateKey(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}
