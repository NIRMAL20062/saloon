import { serviceRoleClient } from '../_shared/auth.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { parseRazorpayWebhookPayload, verifyRazorpaySignature } from '../_shared/payments-logic.ts';

/**
 * Razorpay calls this directly — it carries no Supabase session/JWT, so
 * there's nothing to authenticate the normal way. The signature check below
 * IS the authentication: it proves the request genuinely came from Razorpay
 * (signed with a secret only Razorpay and this function know), and it runs
 * before any other code touches the request body or the database
 * (CLAUDE.md Section 5.5 — verify signature "before doing anything else").
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  // Read as raw text FIRST — verifying against a re-serialized JSON.parse of
  // the body can byte-for-byte differ from what Razorpay actually signed
  // (whitespace, key order) and silently break signature verification.
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-razorpay-signature');

  // Security_context.md Section 2.C: fail loudly on a missing critical
  // secret rather than proceeding with an insecure default. `Deno.env.get(
  // ...)!` is only a TypeScript assertion — at runtime a missing secret would
  // silently become the literal string "undefined", and every webhook would
  // then verify against a fixed, guessable HMAC key instead of the real one.
  // That's a fail-OPEN misconfiguration on the one function whose entire
  // security model rests on this secret being correct, so it's checked
  // explicitly before any signature comparison happens.
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('[razorpay-webhook] Missing RAZORPAY_WEBHOOK_SECRET — refusing to process any webhook.');
    return jsonResponse({ error: 'Webhook processing is misconfigured.' }, 500);
  }

  const isValid = await verifyRazorpaySignature(rawBody, signatureHeader, webhookSecret);
  if (!isValid) {
    console.warn('[razorpay-webhook] rejected: invalid or missing signature');
    return jsonResponse({ error: 'Invalid signature.' }, 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Malformed JSON body.' }, 400);
  }

  const event = parseRazorpayWebhookPayload(body);
  if (!event) {
    // An event type this app doesn't act on, or an unexpectedly-shaped
    // payload — acknowledge with 200 so Razorpay doesn't keep retrying an
    // event that was never going to be handled differently next time.
    return jsonResponse({ received: true, handled: false });
  }

  const supabase = serviceRoleClient();
  const { error } = await supabase.rpc('process_payment_webhook', {
    p_event_type: event.eventType,
    p_razorpay_order_id: event.orderId,
    p_razorpay_payment_id: event.paymentId,
    p_amount: event.amount,
    p_method: event.method,
  });

  if (error) {
    // GL030 (unknown order) / GL031 (amount mismatch) are exactly the cases
    // worth a loud server-side log — either would mean something is
    // seriously wrong (a forged-but-signed request is not possible here,
    // but a misconfigured Razorpay account or a real attempted amount
    // manipulation both look like this).
    console.error('[razorpay-webhook] process_payment_webhook failed:', error.code, error.message);
    return jsonResponse({ error: 'Could not process webhook.' }, 500);
  }

  return jsonResponse({ received: true, handled: true });
});
