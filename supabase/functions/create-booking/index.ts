import { getAuthenticatedUserId, serviceRoleClient } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  BOOKING_BUFFER_MINUTES,
  SHOP_RESPONSE_SECONDS,
  SLOT_HOLD_MINUTES,
} from '../_shared/booking-logic.ts';

// Maps the SQL functions' custom SQLSTATE codes (migration 0008) to the HTTP
// status/message a client should see — a raw Postgres error message is never
// forwarded verbatim (it could leak schema details), but these are all
// deliberately-authored, safe-to-show strings from the function itself.
const ERROR_STATUS: Record<string, number> = {
  GL001: 409, // shop not accepting bookings
  GL002: 409, // barber unavailable
  GL003: 400, // no services
  GL004: 400, // invalid service id
  GL005: 400, // scheduled in the past
  GL006: 409, // shop closed that day
  GL007: 409, // outside opening hours
  '23P01': 409, // exclusion constraint violation — the slot was just taken
};

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const customerId = await getAuthenticatedUserId(req);
  if (!customerId) return jsonResponse({ error: 'Not authenticated.' }, 401);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Malformed JSON body.' }, 400);
  }

  // Lightweight shape validation (CLAUDE.md Section 5.4) — reject with 400
  // before this ever reaches the database, rather than letting a malformed
  // payload surface as a confusing SQL error.
  if (typeof payload !== 'object' || payload === null) {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }
  const { shop_id, barber_id, service_ids, scheduled_at } = payload as Record<string, unknown>;

  if (!isUuid(shop_id)) return jsonResponse({ error: 'shop_id must be a valid id.' }, 400);
  if (!isUuid(barber_id)) return jsonResponse({ error: 'barber_id must be a valid id.' }, 400);
  if (!Array.isArray(service_ids) || service_ids.length === 0 || !service_ids.every(isUuid)) {
    return jsonResponse({ error: 'service_ids must be a non-empty list of valid ids.' }, 400);
  }
  if (typeof scheduled_at !== 'string' || Number.isNaN(Date.parse(scheduled_at))) {
    return jsonResponse({ error: 'scheduled_at must be a valid ISO timestamp.' }, 400);
  }

  const supabase = serviceRoleClient();
  const { data, error } = await supabase.rpc('create_slot_booking', {
    p_customer_id: customerId,
    p_shop_id: shop_id,
    p_barber_id: barber_id,
    p_service_ids: service_ids,
    p_scheduled_at: scheduled_at,
    p_hold_minutes: SLOT_HOLD_MINUTES,
    p_response_seconds: SHOP_RESPONSE_SECONDS,
    p_buffer_minutes: BOOKING_BUFFER_MINUTES,
  });

  if (error) {
    const status = ERROR_STATUS[error.code ?? ''] ?? 400;
    const message =
      error.code === '23P01'
        ? 'That time was just taken by another booking — pick a different slot.'
        : error.message;
    return jsonResponse({ error: message }, status);
  }

  return jsonResponse({ booking: data });
});
