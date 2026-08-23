import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { sendOtp, verifyOtp } from '@/features/auth/otp';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } finally {
      setVerifying(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setResending(true);
    try {
      await sendOtp(phone);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <ThemedText type="title">Enter the code</ThemedText>
      <ThemedText style={styles.label}>Sent to {phone}</ThemedText>
      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoFocus
        maxLength={6}
        style={styles.input}
        placeholder="123456"
        placeholderTextColor="#888"
      />
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      <Pressable style={styles.button} onPress={onVerify} disabled={verifying}>
        {verifying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Verify</ThemedText>
        )}
      </Pressable>
      <Pressable onPress={onResend} disabled={resending} style={styles.resend}>
        <ThemedText type="link">{resending ? 'Resending…' : 'Resend code'}</ThemedText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  label: { marginBottom: 8 },
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
  resend: { alignItems: 'center', marginTop: 12 },
});
