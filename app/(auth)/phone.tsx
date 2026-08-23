import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DEV_ACCOUNTS } from '@/features/auth/dev-accounts';
import { isLikelyValidPhone, sendOtp } from '@/features/auth/otp';
import { supabase } from '@/lib/supabase/client';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('+91');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDevSignIn = async (account: (typeof DEV_ACCOUNTS)[number]) => {
    setError(null);
    setSending(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword(account);
      if (signInError) throw signInError;
      // No manual navigation: the new session flows through the same
      // AuthProvider/Stack.Protected path as a real OTP login.
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
      setError('Enter a full phone number with country code, e.g. +919876543210');
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
      <ThemedText type="title">GLIDE</ThemedText>
      <ThemedText style={styles.label}>Enter your phone number</ThemedText>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoFocus
        style={styles.input}
        placeholder="+919876543210"
        placeholderTextColor="#888"
      />
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <Pressable style={styles.button} onPress={onSubmit} disabled={sending}>
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Send code</ThemedText>
        )}
      </Pressable>

      {__DEV__ ? (
        <ThemedView style={styles.devBox}>
          <ThemedText style={styles.devLabel}>Dev sign-in — skips OTP, no SMS sent</ThemedText>
          {DEV_ACCOUNTS.map((account) => (
            <Pressable
              key={account.email}
              style={styles.devButton}
              disabled={sending}
              onPress={() => onDevSignIn(account)}>
              <ThemedText style={styles.devButtonText}>{account.label}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  label: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111',
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c0392b' },
  devBox: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 16,
    gap: 8,
  },
  devLabel: { fontSize: 12, opacity: 0.6 },
  devButton: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  devButtonText: { fontWeight: '600' },
});
