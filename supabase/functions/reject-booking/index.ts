import { getAuthenticatedUserId, serviceRoleClient } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const actorId = await getAuthenticatedUserId(req);
  if (!actorId) return jsonResponse({ error: 'Not authenticated.' }, 401);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Malformed JSON body.' }, 400);
  }
  const { booking_id, note } = (payload ?? {}) as Record<string, unknown>;
  if (!isUuid(booking_id)) return jsonResponse({ error: 'booking_id must be a valid id.' }, 400);
  if (note !== undefined && typeof note !== 'string') {
    return jsonResponse({ error: 'note must be a string if provided.' }, 400);
  }

  const supabase = serviceRoleClient();
  const { data, error } = await supabase.rpc('reject_booking', {
    p_booking_id: booking_id,
    p_actor_id: actorId,
    p_note: typeof note === 'string' ? note.slice(0, 300) : null,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 409);
  }

  return jsonResponse({ booking: data });
});
