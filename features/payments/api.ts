import { supabase } from '@/lib/supabase/client';

export type PaymentOrder = {
  orderId: string;
  amount: number; // paise — server-resolved from the booking, never client-supplied
  keyId: string; // Razorpay key id — public, safe to expose (identifies the account, not a credential)
};

/**
 * All the real decisions (is this booking actually payable, what does it
 * cost, is the payment window still open) happen server-side in
 * `create-payment-order`/`begin_payment_order` — this is a thin, typed
 * wrapper (CLAUDE.md Section 4.1).
 */
export async function createPaymentOrder(bookingId: string): Promise<PaymentOrder> {
  const { data, error } = await supabase.functions.invoke('create-payment-order', {
    body: { booking_id: bookingId },
  });

  if (error) throw new Error(await extractFunctionError(error));
  return data as PaymentOrder;
}

/** The Supabase JS client's FunctionsHttpError body is the JSON `{ error }` the Edge Function returned. */
async function extractFunctionError(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json();
        if (typeof body?.error === 'string') return body.error;
      } catch {
        // fall through to the generic message below
      }
    }
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
