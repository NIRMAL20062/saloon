import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
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

type ScreenState = 'loading_order' | 'checkout' | 'confirming' | 'confirmed' | 'payment_failed' | 'load_error';

/**
 * A minimal, self-contained HTML page that loads Razorpay's own Checkout.js
 * and opens it immediately — the WebView approach CLAUDE.md's Phase 5 build
 * calls for staying on: Razorpay's official React Native SDK is a native
 * module that would require ejecting from Expo Go into a dev build, which
 * this project deliberately isn't doing yet (Section 7). Every outcome
 * (success/failure/dismiss) is posted back to React Native as a message —
 * the success case is still only a UI hint here, never trusted directly;
 * see the `checkout` -> `confirming` transition below.
 */
function buildCheckoutHtml(order: PaymentOrder, prefill: { name: string; contact: string }): string {
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;background:transparent;">
  <script>
    function post(message) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }

    var started = false;
    function startCheckout() {
      // Guards against both the script's onload firing AND the fallback
      // timer below both trying to open checkout.
      if (started) return;
      started = true;

      var options = {
        key: ${JSON.stringify(order.keyId)},
        amount: ${JSON.stringify(order.amount)},
        currency: "INR",
        order_id: ${JSON.stringify(order.orderId)},
        name: "GLIDE",
        prefill: ${JSON.stringify(prefill)},
        handler: function (response) {
          post({ type: "success", razorpay_payment_id: response.razorpay_payment_id });
        },
        modal: {
          ondismiss: function () {
            post({ type: "dismiss" });
          },
        },
        theme: { color: "#9A7650" }
      };
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function (response) {
        post({ type: "failure", description: response.error && response.error.description });
      });
      rzp.open();
    }

    // Explicitly wait for checkout.js's own load event rather than relying
    // on document-order synchronous script execution — that's supposed to
    // guarantee this code runs after checkout.js has finished loading, but
    // in practice a WebView (vs. a real browser) occasionally constructed
    // Razorpay before the SDK had fully initialized, producing an
    // "Error in opening checkout" alert on the very first attempt. A 4s
    // fallback covers the rare case a WebView doesn't fire onload for an
    // externally-injected script at all.
    var script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = startCheckout;
    script.onerror = function () {
      post({ type: "failure", description: "Could not load the payment page. Check your connection and try again." });
    };
    document.body.appendChild(script);

    setTimeout(function () {
      if (!started && typeof Razorpay !== "undefined") startCheckout();
    }, 4000);
  </script>
</body>
</html>`;
}

export default function PaymentScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { profile } = useAuth();

  const [state, setState] = useState<ScreenState>('loading_order');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadline = useRef<number>(0);

  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const textMuted = useThemeColor({}, 'textMuted');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const icon = useThemeColor({}, 'icon');

  const startOrder = useCallback(async () => {
    setState('loading_order');
    setErrorMessage(null);
    try {
      const created = await createPaymentOrder(bookingId);
      setOrder(created);
      setState('checkout');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not start payment.');
      setState('load_error');
    }
  }, [bookingId]);

  useEffect(() => {
    startOrder();
  }, [startOrder]);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  function beginConfirmingPoll() {
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
  }

  function handleWebViewMessage(event: WebViewMessageEvent) {
    let message: { type: string; description?: string };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (message.type === 'success') {
      // Only a UI hint — the real confirmation is the webhook flipping the
      // booking to `confirmed`, which the poll above actually observes.
      beginConfirmingPoll();
    } else if (message.type === 'failure') {
      setErrorMessage(message.description ?? 'Payment failed.');
      setState('payment_failed');
    } else if (message.type === 'dismiss') {
      setState('payment_failed');
    }
  }

  if (state === 'loading_order') {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={tint} />
        <ThemedText style={{ color: textMuted, marginTop: Spacing.md }}>Preparing payment…</ThemedText>
      </Screen>
    );
  }

  if (state === 'checkout' && order) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              tapFeedback();
              router.back();
            }}
            style={[styles.backBtn, { backgroundColor: surface, borderColor: surfaceBorder }]}
            hitSlop={12}>
            <Ionicons name="close" size={20} color={icon} />
          </Pressable>
          <ThemedText style={styles.screenTitle}>Complete Payment</ThemedText>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{
            html: buildCheckoutHtml(order, {
              name: profile?.full_name ?? '',
              contact: profile?.phone ?? '',
            }),
            // Razorpay's checkout.js is fetched from a real CDN inside this
            // page, so the WebView needs an actual base URL (not blank) for
            // its own relative requests/cookies to resolve correctly.
            baseUrl: 'https://checkout.razorpay.com',
          }}
          onMessage={handleWebViewMessage}
          style={styles.webview}
          // Checkout.js does its own browser-compatibility check on load and
          // falls back to a generic "Something went wrong" error page if it
          // doesn't see what it expects — a bare WebView fails that check
          // without these explicitly enabled (localStorage/cookies it uses
          // internally, and third-party cookies specifically on Android for
          // some payment methods), and the default embedded-WebView
          // user-agent string alone can trip the same check even with
          // everything else enabled.
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          mixedContentMode="always"
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />
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
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 20, fontWeight: '800' },
  webview: { flex: 1 },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl, flexWrap: 'wrap', justifyContent: 'center' },
});
