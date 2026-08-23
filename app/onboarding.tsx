import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth, type Role } from '@/features/auth/auth-provider';
import { supabase } from '@/lib/supabase/client';

// Shown exactly once per account: right after the first-ever successful OTP
// verification, when a session exists but no `profiles` row does yet.
// Role is set once here and is not editable from within the app afterwards.
export default function OnboardingScreen() {
  const { session, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!session) return;
    setError(null);
    if (!fullName.trim()) {
      setError('Enter your name.');
      return;
    }
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: session.user.id,
        phone: session.user.phone,
        full_name: fullName.trim(),
        role,
      });
      if (insertError) throw insertError;
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Welcome to GLIDE</ThemedText>

      <ThemedText style={styles.label}>Your name</ThemedText>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor="#888"
        autoFocus
      />

      <ThemedText style={styles.label}>I am a...</ThemedText>
      <ThemedView style={styles.roleRow}>
        <Pressable
          style={[styles.roleOption, role === 'customer' && styles.roleOptionActive]}
          onPress={() => setRole('customer')}>
          <ThemedText style={role === 'customer' ? styles.roleTextActive : undefined}>
            Customer
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.roleOption, role === 'partner' && styles.roleOptionActive]}
          onPress={() => setRole('partner')}>
          <ThemedText style={role === 'partner' ? styles.roleTextActive : undefined}>
            Shop / Partner
          </ThemedText>
        </Pressable>
      </ThemedView>

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Continue</ThemedText>
        )}
      </Pressable>
    </ThemedView>
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
  roleRow: { flexDirection: 'row', gap: 12 },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  roleOptionActive: { backgroundColor: '#111', borderColor: '#111' },
  roleTextActive: { color: '#fff' },
  button: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c0392b' },
});
