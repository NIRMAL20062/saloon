import {
  parseRazorpayWebhookPayload,
  verifyRazorpaySignature,
} from '../supabase/functions/_shared/payments-logic';

const WEBHOOK_SECRET = 'whsec_test_secret_do_not_use_in_prod';

async function sign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('verifyRazorpaySignature', () => {
  const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } });

  it('accepts a correctly signed payload', async () => {
    const signature = await sign(rawBody, WEBHOOK_SECRET);
    expect(await verifyRazorpaySignature(rawBody, signature, WEBHOOK_SECRET)).toBe(true);
  });

  it('rejects a payload that was tampered with after signing', async () => {
    const signature = await sign(rawBody, WEBHOOK_SECRET);
    const tamperedBody = rawBody.replace('payment.captured', 'payment.failed');
    expect(await verifyRazorpaySignature(tamperedBody, signature, WEBHOOK_SECRET)).toBe(false);
  });

  it('rejects a signature computed with the wrong secret', async () => {
    const signature = await sign(rawBody, 'a-completely-different-secret');
    expect(await verifyRazorpaySignature(rawBody, signature, WEBHOOK_SECRET)).toBe(false);
  });

  it('rejects a missing signature header', async () => {
    expect(await verifyRazorpaySignature(rawBody, null, WEBHOOK_SECRET)).toBe(false);
  });

  it('rejects a signature of the wrong length outright (no length-mismatch crash)', async () => {
    expect(await verifyRazorpaySignature(rawBody, 'deadbeef', WEBHOOK_SECRET)).toBe(false);
  });
});

describe('parseRazorpayWebhookPayload', () => {
  function validPayload(event: 'payment.captured' | 'payment.failed') {
    return {
      event,
      payload: {
        payment: {
          entity: { id: 'pay_123', order_id: 'order_456', amount: 30000, method: 'card' },
        },
      },
    };
  }

  it('parses a valid payment.captured payload', () => {
    const parsed = parseRazorpayWebhookPayload(validPayload('payment.captured'));
    expect(parsed).toEqual({
      eventType: 'payment.captured',
      orderId: 'order_456',
      paymentId: 'pay_123',
      amount: 30000,
      method: 'card',
    });
  });

  it('parses a valid payment.failed payload', () => {
    const parsed = parseRazorpayWebhookPayload(validPayload('payment.failed'));
    expect(parsed?.eventType).toBe('payment.failed');
  });

  it('rejects an event type this app does not handle', () => {
    expect(parseRazorpayWebhookPayload({ ...validPayload('payment.captured'), event: 'refund.processed' })).toBeNull();
  });

  it('rejects a payload missing the payment entity', () => {
    expect(parseRazorpayWebhookPayload({ event: 'payment.captured', payload: {} })).toBeNull();
  });

  it('rejects a payload with a non-numeric amount', () => {
    const bad = validPayload('payment.captured');
    (bad.payload.payment.entity as any).amount = '30000';
    expect(parseRazorpayWebhookPayload(bad)).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(parseRazorpayWebhookPayload(null)).toBeNull();
    expect(parseRazorpayWebhookPayload('not an object')).toBeNull();
  });
});
