import { getAuthenticatedUserId, serviceRoleClient } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { PAYMENT_WINDOW_MINUTES } from '../_shared/payments-logic.ts';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  // The actor is always resolved from the JWT, not a `shop_owner_id` field a
  // caller could put in the body — `accept_booking`'s SQL re-checks that this
  // uid actually owns the shop the booking belongs to before it moves.
  const actorId = await getAuthenticatedUserId(req);
  if (!actorId) return jsonResponse({ error: 'Not authenticated.' }, 401);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Malformed JSON body.' }, 400);
  }
  const { booking_id } = (payload ?? {}) as Record<string, unknown>;
  if (!isUuid(booking_id)) return jsonResponse({ error: 'booking_id must be a valid id.' }, 400);

  const supabase = serviceRoleClient();
  const { data, error } = await supabase.rpc('accept_booking', {
    p_booking_id: booking_id,
    p_actor_id: actorId,
    p_payment_window_minutes: PAYMENT_WINDOW_MINUTES,
  });

  if (error) {
    // GL010 covers every reason this can fail (already resolved, expired, or
    // not this caller's shop) — deliberately one generic message rather than
    // distinguishing "not yours" from "already gone", which would let a
    // caller probe which booking ids exist and belong to someone else.
    return jsonResponse({ error: error.message }, 409);
  }

  return jsonResponse({ booking: data });
});
