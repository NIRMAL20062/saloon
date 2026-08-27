import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export default function CustomerProfileScreen() {
  const { profile, signOut } = useAuth();

  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textPrimary = useThemeColor({}, 'text');

  const MENU_ITEMS = [
    { id: 'bookings', icon: 'calendar-outline', label: 'My Bookings', path: '/(customer)/bookings' },
    { id: 'saved', icon: 'heart-outline', label: 'Saved Salons', path: '/(customer)/saved' },
    // No `path` = not built yet (Payment Methods is Phase 5, Notification
    // Preferences is Phase 8) — tapping these says so explicitly rather than
    // silently doing nothing, which otherwise reads as a broken button since
    // they're styled identically to the working rows above.
    { id: 'payments', icon: 'card-outline', label: 'Payment Methods' },
    { id: 'notifications', icon: 'notifications-outline', label: 'Notification Preferences' },
    { id: 'help', icon: 'help-circle-outline', label: 'Help & Support' },
  ];

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Profile Card Header */}
        <View style={[styles.profileCard, { backgroundColor: surface, borderColor: surfaceBorder }]}>
          <View style={[styles.avatarCircle, { backgroundColor: tint }]}>
            <ThemedText style={[styles.avatarText, { color: onTint }]}>
              {profile?.full_name?.charAt(0).toUpperCase() ?? 'D'}
            </ThemedText>
          </View>

          <View style={styles.profileInfo}>
            <ThemedText style={styles.nameText}>{profile?.full_name ?? 'there'}</ThemedText>
            {profile?.phone ? (
              <ThemedText style={[styles.phoneText, { color: textMuted }]}>{profile.phone}</ThemedText>
            ) : null}
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item, index) => (
            <React.Fragment key={item.id}>
              <Pressable
                onPress={() => {
                  tapFeedback();
                  if (item.path) router.push(item.path as any);
                  else Alert.alert('Coming soon', `${item.label} isn't available yet.`);
                }}
                style={({ pressed }) => [
                  styles.menuRow,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.menuLeft}>
                  <Ionicons name={item.icon as any} size={20} color={item.path ? textPrimary : textMuted} />
                  <ThemedText style={[styles.menuText, !item.path && { color: textMuted }]}>{item.label}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={textMuted} />
              </Pressable>
              {index < MENU_ITEMS.length - 1 && (
                <View style={[styles.hairline, { backgroundColor: surfaceBorder }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Sign Out Button */}
        <Pressable
          onPress={() => {
            tapFeedback();
            signOut();
          }}
          style={({ pressed }) => [
            styles.signOutBtn,
            { borderColor: Colors.light.danger },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="log-out-outline" size={18} color={Colors.light.danger} />
          <ThemedText style={[styles.signOutText, { color: Colors.light.danger }]}>
            Sign Out
          </ThemedText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  scroll: { paddingBottom: 100, gap: Spacing.lg, paddingTop: Spacing.sm },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  profileInfo: { gap: 2 },
  nameText: { ...Typography.sectionHeader, fontSize: 18, fontWeight: '800' },
  phoneText: { ...Typography.bodyText, fontSize: 13 },
  menuSection: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuText: { ...Typography.cardTitle, fontSize: 15, fontWeight: '600' },
  hairline: { height: StyleSheet.hairlineWidth, width: '100%' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  signOutText: { ...Typography.badgeText, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.8 },
});
