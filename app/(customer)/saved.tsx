import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * Favoriting isn't a real, persisted feature yet — no `favorites` table
 * exists (it isn't in any CLAUDE.md phase), and the heart icons scattered
 * across the app (ShopCard, shop detail) are currently just local, per-render
 * visual toggles with no storage behind them. This screen used to fabricate
 * its contents (`shops.slice(0, 2)`) to look populated regardless of what a
 * user actually tapped — showing the same two shops to everyone. Until real
 * persistence exists, the honest state is genuinely empty, always.
 */
export default function SavedSalonsScreen() {
  const textMuted = useThemeColor({}, 'textMuted');

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.screenTitle}>Saved Salons</ThemedText>
        <ThemedText style={[styles.subTitle, { color: textMuted }]}>
          Your favorite grooming spots saved for fast booking
        </ThemedText>
      </View>

      <EmptyState
        iconName="heart-outline"
        title="No Saved Salons Yet"
        description="Tap the heart icon on any salon to save it here for fast access."
        actionLabel="Explore Salons"
        onAction={() => router.push('/(customer)/explore')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  header: { gap: Spacing.xs, marginTop: Spacing.sm, marginBottom: Spacing.md },
  screenTitle: { ...Typography.screenTitle, fontSize: 26 },
  subTitle: { ...Typography.bodyText, fontSize: 13 },
  list: { paddingBottom: 100 },
});
