import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth, type Role } from '@/features/auth/auth-provider';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';
import { supabase } from '@/lib/supabase/client';

const ROLE_OPTIONS: { role: Role; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { role: 'customer', label: 'Customer', desc: 'Book haircuts & grooming', icon: 'person-sharp' },
  { role: 'partner', label: 'Shop Owner', desc: 'Manage salon & barbers', icon: 'storefront-sharp' },
];

export default function OnboardingScreen() {
  const { session, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const border = useThemeColor({}, 'border');
  const danger = useThemeColor({}, 'danger');
  const surface = useThemeColor({}, 'surface');
  const textMuted = useThemeColor({}, 'textMuted');

  const onSubmit = async () => {
    if (!session) return;
    setError(null);
    if (!fullName.trim()) {
      setError('Please enter your full name.');
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
      setError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.headerBlock}>
        <ThemedText type="title" style={styles.title}>
          Welcome to GLIDE 👋
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: textMuted }]}>
          Set up your profile to get started
        </ThemedText>
      </View>

      <Card style={styles.card}>
        <ThemedText style={styles.label}>Your Full Name</ThemedText>
        <ThemedTextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="e.g. Rohan Sharma"
          autoFocus
          style={styles.input}
        />

        <ThemedText style={styles.label}>Select Your Role</ThemedText>
        <View style={styles.roleGrid}>
          {ROLE_OPTIONS.map((option) => {
            const active = role === option.role;
            return (
              <Pressable
                key={option.role}
                style={({ pressed }) => [
                  styles.roleCard,
                  {
                    backgroundColor: active ? tint : surface,
                    borderColor: active ? tint : border,
                  },
                  active && Shadow.glow,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  tapFeedback();
                  setRole(option.role);
                }}>
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={active ? onTint : tint}
                  style={styles.roleIcon}
                />
                <ThemedText style={[styles.roleTitle, active && { color: onTint }]}>
                  {option.label}
                </ThemedText>
                <ThemedText
                  style={[styles.roleDesc, { color: active ? onTint : textMuted }]}
                  numberOfLines={1}>
                  {option.desc}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {error ? <ThemedText style={[styles.errorText, { color: danger }]}>{error}</ThemedText> : null}

        <Button
          title="Complete Profile →"
          onPress={onSubmit}
          loading={saving}
          style={styles.submitButton}
        />
      </Card>
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
    gap: Spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    fontSize: 15,
    fontWeight: '600',
  },
  roleGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  roleCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: 4,
    alignItems: 'flex-start',
  },
  roleIcon: {
    marginBottom: Spacing.xs,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  roleDesc: {
    fontSize: 11,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});

