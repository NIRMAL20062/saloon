import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Chip } from '@/components/ui/chip';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { DEV_ACCOUNTS } from '@/features/auth/dev-accounts';
import { isLikelyValidPhone, sendOtp } from '@/features/auth/otp';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase/client';

/**
 * `__DEV__` alone isn't enough here: it's true in Expo Go / a dev-client
 * connected to Metro, but false in ANY standalone build — including the
 * "preview" EAS profile, which is exactly what gets installed on a real
 * phone to test outside of Metro (no laptop needed). Testing a real
 * installed build was the whole point of getting a preview APK, so gating
 * this on `__DEV__` alone made the bypass invisible in the one place it's
 * most needed: testing on a real device without burning a real OTP send
 * (Twilio's free trial has a hard send limit).
 *
 * `EXPO_PUBLIC_ENABLE_DEV_LOGIN` is set to "true" in eas.json's
 * `development` and `preview` build profiles only — never in `production`,
 * so a real Play Store release still can't ship this no matter what.
 */
const isDevLoginEnabled = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN === 'true';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('+91');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const danger = useThemeColor({}, 'danger');
  const textMuted = useThemeColor({}, 'textMuted');

  const onDevSignIn = async (account: (typeof DEV_ACCOUNTS)[number]) => {
    setError(null);
    setSending(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword(account);
      if (signInError) throw signInError;
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} (did you create this account in Supabase yet?)`
          : 'Dev sign-in failed.'
      );
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async () => {
    setError(null);
    if (!isLikelyValidPhone(phone)) {
      setError('Enter a valid phone number with country code, e.g. +919876543210');
      return;
    }
    setSending(true);
    try {
      await sendOtp(phone);
      router.push({ pathname: '/verify', params: { phone } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={[styles.logo, { backgroundColor: tint }, Shadow.glow]}>
          <Ionicons name="cut-sharp" size={32} color={onTint} />
        </View>
        <ThemedText type="title" style={styles.brandTitle}>
          GLIDE
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: textMuted }]}>
          On-Demand Salons & Instant Barber Booking
        </ThemedText>
      </View>

      <Card style={styles.authCard}>
        <ThemedText style={styles.label}>Enter Mobile Number</ThemedText>
        <View style={styles.phoneInputRow}>
          <ThemedTextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoFocus
            placeholder="+919876543210"
            style={styles.input}
          />
        </View>

        {error ? <ThemedText style={[styles.errorText, { color: danger }]}>{error}</ThemedText> : null}

        <Button title="Get OTP Code →" onPress={onSubmit} loading={sending} style={styles.submitButton} />
      </Card>

      {isDevLoginEnabled ? (
        <Card style={styles.devCard}>
          <View style={styles.devHeader}>
            <Ionicons name="flash-sharp" size={16} color={tint} />
            <ThemedText style={[styles.devTitle, { color: tint }]}>
              Quick Dev Access (1-Tap Bypass)
            </ThemedText>
          </View>
          <View style={styles.devGrid}>
            {DEV_ACCOUNTS.map((account) => (
              <Chip
                key={account.email}
                label={account.label}
                icon={account.email.includes('customer') ? 'person' : 'storefront'}
                disabled={sending}
                onPress={() => onDevSignIn(account)}
                style={styles.devChip}
              />
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  headerBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  authCard: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  phoneInputRow: {
    marginTop: Spacing.xs,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  devCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  devTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  devGrid: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  devChip: {
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
});
