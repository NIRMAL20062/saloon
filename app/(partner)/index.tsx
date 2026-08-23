import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/auth-provider';

// Deliberately blank beyond a greeting + sign out — Phase 1's goal is only
// "land on the correct role-based home screen." Shop management is Phase 3.
export default function PartnerHomeScreen() {
  const { profile, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Hi {profile?.full_name ?? 'there'} 👋</ThemedText>
      <ThemedText>Partner home — shop management arrives in Phase 3.</ThemedText>
      <Pressable style={styles.button} onPress={signOut}>
        <ThemedText style={styles.buttonText}>Sign out</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  button: { backgroundColor: '#111', borderRadius: 8, padding: 14, marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
