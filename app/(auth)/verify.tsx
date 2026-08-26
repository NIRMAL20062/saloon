import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Spacing } from '@/constants/theme';
import { sendOtp, verifyOtp } from '@/features/auth/otp';
import { useThemeColor } from '@/hooks/use-theme-color';

const RESEND_COOLDOWN_MS = 30_000;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The phone screen already sent the first code right before navigating
  // here, so the cooldown starts immediately on mount, not after a first tap.
  const [resendAvailableAt, setResendAvailableAt] = useState(() => Date.now() + RESEND_COOLDOWN_MS);
  const [now, setNow] = useState(() => Date.now());

  const danger = useThemeColor({}, 'danger');

  const secondsLeft = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
  const canResend = secondsLeft === 0 && !resending;

  // Ticks once a second only while a cooldown is actually running — this is
  // purely a UX countdown display, not a source of truth (Supabase's own
  // rate limiting is what actually blocks an early resend, per CLAUDE.md
  // §5.1/5.6); the timer just keeps the user from tapping a button the
  // server would reject anyway.
  useEffect(() => {
    if (secondsLeft === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const onVerify = async () => {
    setError(null);
    if (code.trim().length < 4) {
      setError('Enter the code you received by SMS.');
      return;
    }
    setVerifying(true);
    try {
      await verifyOtp(phone, code.trim());
      // No manual navigation on success: the root layout's Stack.Protected
      // guards react to the new session (via onAuthStateChange) and switch
      // stacks automatically — see app/_layout.tsx.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not work. Try again.');
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  // Auto-submits the instant a full 6-digit code is entered — no separate
  // tap needed, matching the phone screen's auto-advance. Guarded so it
  // can't double-fire while a request is already in flight.
  useEffect(() => {
    if (code.length === 6 && !verifying) {
      onVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const onResend = async () => {
    setError(null);
    setResending(true);
    try {
      await sendOtp(phone);
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen style={styles.container}>
      {router.canGoBack() ? (
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <ThemedText type="link">← Change number</ThemedText>
        </Pressable>
      ) : null}
      <ThemedText type="title">Enter the code</ThemedText>
      <ThemedText type="caption" style={styles.label}>
        Sent to {phone}
      </ThemedText>
      <ThemedTextInput
        value={code}
        onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        autoFocus
        maxLength={6}
        editable={!verifying}
        placeholder="123456"
        style={styles.codeInput}
      />
      {error ? <ThemedText style={{ color: danger }}>{error}</ThemedText> : null}
      <Button title="Verify" onPress={onVerify} loading={verifying} style={styles.submit} />
      <Pressable onPress={onResend} disabled={!canResend} style={styles.resend} hitSlop={12}>
        <ThemedText type={canResend ? 'link' : 'caption'}>
          {resending ? 'Resending…' : canResend ? 'Resend code' : `Resend in 0:${secondsLeft.toString().padStart(2, '0')}`}
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  back: { marginBottom: Spacing.lg },
  label: { marginBottom: Spacing.sm },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  submit: { marginTop: Spacing.xs },
  resend: { alignItems: 'center', marginTop: Spacing.md },
});
