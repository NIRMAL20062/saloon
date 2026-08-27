/**
 * Pure payment logic — deliberately framework-free (no Deno-only or
 * Node-only APIs beyond the standard Web Crypto API, which both runtimes
 * implement) so this file can be imported from the `create-payment-order`/
 * `razorpay-webhook` Edge Functions (Deno) and the Jest unit tests (Node)
 * without drift, exactly like `booking-logic.ts`.
 */

// CLAUDE.md Phase 5 doesn't specify an exact payment window — 10 minutes
// mirrors Phase 4's SLOT_HOLD_MINUTES, giving a customer roughly the same
// amount of time to complete checkout as the original slot hold gave them
// to get through the booking flow in the first place.
export const PAYMENT_WINDOW_MINUTES = 10;

/**
 * Razorpay signs each webhook delivery as `HMAC-SHA256(rawBody, webhookSecret)`,
 * hex-encoded, sent in the `X-Razorpay-Signature` header. This must be
 * checked against the RAW request body — not a re-serialized copy of the
 * parsed JSON, which can byte-for-byte differ from what Razorpay actually
 * signed (key ordering, whitespace) and silently break verification.
 *
 * Uses the standard Web Crypto API (`crypto.subtle`), available natively in
 * both Deno (the Edge Function runtime) and modern Node (Jest here) — no
 * platform-specific `node:crypto` or Deno-only import needed.
 */
export async function verifyRazorpaySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedHex = bufferToHex(signatureBuffer);

  return timingSafeEqualHex(computedHex, signatureHeader);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * A plain `===` on the computed vs. received signature would leak timing
 * information about how many leading characters matched, in principle
 * usable to forge a valid signature byte-by-byte. This compares every
 * character regardless of where the first mismatch is, and only rejects
 * early (safely) on a length difference, which isn't secret information.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export type RazorpayWebhookEventType = 'payment.captured' | 'payment.failed';

/** The subset of a Razorpay webhook payload this app actually reads — never trust or forward the rest. */
export type ParsedRazorpayEvent = {
  eventType: RazorpayWebhookEventType;
  orderId: string;
  paymentId: string;
  amount: number; // paise
  method: string | null;
};

/**
 * Extracts and validates the shape of exactly what's needed from a Razorpay
 * webhook payload — rejects (returns null) anything that isn't one of the
 * two event types this app handles, or is missing a field it can't safely
 * proceed without, rather than passing a loosely-typed blob into the DB call.
 */
export function parseRazorpayWebhookPayload(body: unknown): ParsedRazorpayEvent | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  if (b.event !== 'payment.captured' && b.event !== 'payment.failed') return null;

  const payload = b.payload as Record<string, unknown> | undefined;
  const paymentEntity = (payload?.payment as Record<string, unknown> | undefined)?.entity as
    | Record<string, unknown>
    | undefined;
  if (!paymentEntity) return null;

  const { order_id: orderId, id: paymentId, amount, method } = paymentEntity;
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof amount !== 'number') {
    return null;
  }

  return {
    eventType: b.event,
    orderId,
    paymentId,
    amount,
    method: typeof method === 'string' ? method : null,
  };
}
