import { getAuthenticatedUserId, serviceRoleClient } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

/**
 * Sweeps every `awaiting_shop` booking whose `shop_response_expires_at` has
 * passed to `expired` — CLAUDE.md Phase 4's "a scheduled job (pg_cron or a
 * simple polling check for now)". This is the polling version: called
 * opportunistically from the customer/partner booking-list screens on load
 * rather than a fixed schedule, which is honest about what it actually is —
 * a booking nobody is looking at won't expire the instant its timer runs
 * out, only the next time someone's screen polls. Real-time expiry (pg_cron,
 * or a Realtime-driven client countdown that calls this itself) is a
 * reasonable upgrade later, not required by this phase.
 *
 * Requires *some* authenticated session (any role) — this touches no
 * caller-specific data, but isn't left open to the public internet either.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const callerId = await getAuthenticatedUserId(req);
  if (!callerId) return jsonResponse({ error: 'Not authenticated.' }, 401);

  const supabase = serviceRoleClient();
  const { data, error } = await supabase.rpc('expire_stale_bookings');

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ expiredCount: data });
});
