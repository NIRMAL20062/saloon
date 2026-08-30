import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { fetchBookingStatus } from '@/features/bookings/api';
import { createPaymentOrder, type PaymentOrder } from '@/features/payments/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

// How long the "confirming" screen polls the real booking status before
// telling the customer to just check My Bookings instead of spinning
// forever — the webhook is normally near-instant, but nothing guarantees
// that, and this screen should never claim something it can't verify.
const CONFIRM_POLL_INTERVAL_MS = 2000;
const CONFIRM_POLL_TIMEOUT_MS = 30_000;

type ScreenState = 'loading_order' | 'opening_checkout' | 'confirming' | 'confirmed' | 'payment_failed' | 'load_error';

export default function PaymentScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { profile } = useAuth();

  const [state, setState] = useState<ScreenState>('loading_order');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadline = useRef<number>(0);

  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const textMuted = useThemeColor({}, 'textMuted');

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const beginConfirmingPoll = useCallback(() => {
    setState('confirming');
    pollDeadline.current = Date.now() + CONFIRM_POLL_TIMEOUT_MS;
    pollTimer.current = setInterval(async () => {
      try {
        const booking = await fetchBookingStatus(bookingId);
        if (booking.status === 'confirmed') {
          if (pollTimer.current) clearInterval(pollTimer.current);
          tapFeedback();
          setState('confirmed');
          return;
        }
        if (booking.payment_status === 'failed') {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setState('payment_failed');
          return;
        }
      } catch {
        // A transient read failure mid-poll isn't fatal — just try again
        // next tick until the timeout below gives up for good.
      }
      if (Date.now() > pollDeadline.current) {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setErrorMessage(
          "Payment is taking longer than usual to confirm. Check My Bookings in a moment — you won't be charged twice."
        );
        setState('load_error');
      }
    }, CONFIRM_POLL_INTERVAL_MS);
  }, [bookingId]);

  /**
   * Native Razorpay Checkout — replaces the earlier WebView/Checkout.js
   * approach entirely. HONEST LIMITATION: this needs the custom dev-client
   * build (eas.json's "development" profile) to actually run — the native
   * module this imports doesn't exist in plain Expo Go, and this has not
   * been exercised on a real device yet (no device available while writing
   * it). If `RazorpayCheckout.open` isn't actually linked (i.e. still
   * running in Expo Go), this fails clearly rather than crashing oddly.
   *
   * Exactly like the WebView version before it: a resolved/rejected promise
   * here is still only a UI hint, never a source of truth — the real
   * confirmation is the webhook flipping the booking to `confirmed`, which
   * `beginConfirmingPoll` actually observes.
   */
  const openCheckout = useCallback(
    async (order: PaymentOrder) => {
      setState('opening_checkout');
      try {
        await RazorpayCheckout.open({
          key: order.keyId,
          amount: order.amount,
          currency: 'INR',
          order_id: order.orderId,
          name: 'GLIDE',
          description: 'Booking payment',
          prefill: { name: profile?.full_name ?? '', contact: profile?.phone ?? '' },
          theme: { color: '#9A7650' },
        });
        beginConfirmingPoll();
      } catch (e) {
        // Covers both a real payment failure and the user closing the
        // checkout sheet — the Razorpay SDK doesn't reliably distinguish
        // these across versions, and the UI copy below ("Payment not
        // completed") is accurate either way.
        const description =
          e && typeof e === 'object' && 'description' in e && typeof (e as { description?: unknown }).description === 'string'
            ? (e as { description: string }).description
            : 'Payment was not completed.';
        setErrorMessage(description);
        setState('payment_failed');
      }
    },
    [profile, beginConfirmingPoll]
  );

  const startOrder = useCallback(async () => {
    setState('loading_order');
    setErrorMessage(null);
    try {
      const created = await createPaymentOrder(bookingId);
      await openCheckout(created);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not start payment.');
      setState('load_error');
    }
  }, [bookingId, openCheckout]);

  useEffect(() => {
    startOrder();
  }, [startOrder]);

  if (state === 'loading_order' || state === 'opening_checkout') {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={tint} />
        <ThemedText style={{ color: textMuted, marginTop: Spacing.md }}>
          {state === 'loading_order' ? 'Preparing payment…' : 'Opening secure checkout…'}
        </ThemedText>
      </Screen>
    );
  }

  if (state === 'confirming') {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={tint} />
        <ThemedText type="subtitle" style={{ marginTop: Spacing.lg }}>
          Confirming your booking…
        </ThemedText>
        <ThemedText style={{ color: textMuted, textAlign: 'center', marginTop: Spacing.xs, paddingHorizontal: Spacing.xl }}>
          Payment received — waiting for the shop&apos;s confirmation. This is usually instant.
        </ThemedText>
      </Screen>
    );
  }

  if (state === 'confirmed') {
    return (
      <Screen style={styles.center}>
        <View style={[styles.successCircle, { backgroundColor: success }]}>
          <Ionicons name="checkmark" size={32} color="#FFFFFF" />
        </View>
        <ThemedText type="subtitle" style={{ marginTop: Spacing.lg }}>
          Booking confirmed
        </ThemedText>
        <ThemedText style={{ color: textMuted, textAlign: 'center', marginTop: Spacing.xs }}>
          You&apos;re all set. See you at your appointment.
        </ThemedText>
        <Button
          title="View My Bookings"
          onPress={() => router.replace('/(customer)/bookings')}
          style={{ marginTop: Spacing.xl, minWidth: 200 }}
        />
      </Screen>
    );
  }

  // payment_failed / load_error
  return (
    <Screen style={styles.center}>
      <View style={[styles.successCircle, { backgroundColor: danger }]}>
        <Ionicons name="close" size={32} color="#FFFFFF" />
      </View>
      <ThemedText type="subtitle" style={{ marginTop: Spacing.lg }}>
        {state === 'payment_failed' ? 'Payment not completed' : 'Something went wrong'}
      </ThemedText>
      {errorMessage ? (
        <ThemedText style={{ color: textMuted, textAlign: 'center', marginTop: Spacing.xs, paddingHorizontal: Spacing.xl }}>
          {errorMessage}
        </ThemedText>
      ) : null}
      <View style={styles.retryRow}>
        <Button title="Try Again" onPress={startOrder} style={{ minWidth: 160 }} />
        <Button title="Back to Bookings" variant="secondary" onPress={() => router.replace('/(customer)/bookings')} style={{ minWidth: 160 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl, flexWrap: 'wrap', justifyContent: 'center' },
});
