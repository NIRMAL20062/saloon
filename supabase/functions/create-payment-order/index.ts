import { getAuthenticatedUserId, serviceRoleClient } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const ERROR_STATUS: Record<string, number> = {
  GL020: 404, // booking not found / not yours
  GL021: 409, // not awaiting payment
  GL022: 409, // payment window expired
};

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
  const { booking_id } = (payload ?? {}) as Record<string, unknown>;
  if (!isUuid(booking_id)) return jsonResponse({ error: 'booking_id must be a valid id.' }, 400);

  const supabase = serviceRoleClient();

  // Re-verifies ownership, status, and expiry server-side (CLAUDE.md Section
  // 4.1) — the amount this returns (`total_amount`) is the one thing this
  // function will ever ask Razorpay to charge, never anything the client sent.
  const { data: booking, error: beginError } = await supabase.rpc('begin_payment_order', {
    p_booking_id: booking_id,
    p_customer_id: customerId,
  });
  if (beginError) {
    const status = ERROR_STATUS[beginError.code ?? ''] ?? 400;
    return jsonResponse({ error: beginError.message }, status);
  }

  // Security_context.md Section 2.C: a missing critical secret must fail
  // loudly, not silently proceed — `Deno.env.get(...)!` is only a TypeScript
  // assertion, it does nothing at runtime, so without this check a missing
  // secret would flow into `btoa("undefined:undefined")` and surface as a
  // confusing 502 from Razorpay instead of a clear, immediate error here.
  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) {
    console.error('[create-payment-order] Missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET secrets.');
    return jsonResponse({ error: 'Payments are temporarily unavailable. Please try again later.' }, 500);
  }

  // Reuse an existing, still-open order for this booking rather than
  // creating a second Razorpay order every time a customer re-opens the
  // checkout screen (e.g. backgrounding the app mid-payment and returning).
  const { data: existing } = await supabase
    .from('payments')
    .select('razorpay_order_id, amount, status')
    .eq('booking_id', booking.id)
    .in('status', ['created', 'pending'])
    .maybeSingle();

  if (existing) {
    return jsonResponse({ orderId: existing.razorpay_order_id, amount: existing.amount, keyId });
  }

  const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: booking.total_amount,
      currency: 'INR',
      receipt: booking.id,
    }),
  });

  if (!orderResponse.ok) {
    // Never forward Razorpay's raw error body to the client — it can
    // contain account-identifying details not meant for an end user.
    console.error('[create-payment-order] Razorpay order creation failed:', await orderResponse.text());
    return jsonResponse({ error: 'Could not start payment. Please try again.' }, 502);
  }

  const order = await orderResponse.json();

  const { data: payment, error: recordError } = await supabase.rpc('record_payment_order', {
    p_booking_id: booking.id,
    p_razorpay_order_id: order.id,
    p_amount: booking.total_amount,
  });
  if (recordError) return jsonResponse({ error: recordError.message }, 500);

  return jsonResponse({ orderId: payment.razorpay_order_id, amount: payment.amount, keyId });
});
