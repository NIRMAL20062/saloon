import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export interface ArrivalCardProps {
  shopName?: string;
  barberName?: string;
  timeSlot?: string;
  minutesRemaining?: number;
  onPressDirections?: () => void;
  onPressQr?: () => void;
}

export function ArrivalCard({
  shopName = 'The Grooming Station',
  barberName = 'Alex',
  timeSlot = 'Today · 05:00 PM',
  minutesRemaining = 18,
  onPressDirections,
  onPressQr,
}: ArrivalCardProps) {
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: surfaceBorder }]}>
      <View style={styles.header}>
        <View style={styles.liveTag}>
          <View style={[styles.pulseDot, { backgroundColor: Colors.light.success }]} />
          <ThemedText style={styles.liveText}>APPOINTMENT TODAY</ThemedText>
        </View>

        <ThemedText style={[styles.countdownText, { color: tint }]}>
          In {minutesRemaining} mins
        </ThemedText>
      </View>

      <View style={styles.body}>
        <ThemedText style={[styles.shopName, { color: textPrimary }]}>{shopName}</ThemedText>
        <ThemedText style={[styles.metaText, { color: textMuted }]}>
          Stylist: {barberName} · {timeSlot}
        </ThemedText>
      </View>

      <View style={[styles.hairline, { backgroundColor: surfaceBorder }]} />

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => {
            tapFeedback();
            if (onPressDirections) onPressDirections();
          }}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
          <Ionicons name="navigate-outline" size={15} color={tint} />
          <ThemedText style={[styles.actionBtnText, { color: textPrimary }]}>Directions</ThemedText>
        </Pressable>

        <View style={[styles.vDivider, { backgroundColor: surfaceBorder }]} />

        <Pressable
          onPress={() => {
            tapFeedback();
            if (onPressQr) onPressQr();
          }}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
          <Ionicons name="qr-code-outline" size={15} color={tint} />
          <ThemedText style={[styles.actionBtnText, { color: textPrimary }]}>Arrival QR</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    ...Typography.microTracked,
    color: Colors.light.success,
    fontSize: 10,
    fontWeight: '800',
  },
  countdownText: {
    ...Typography.badgeText,
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    gap: 2,
  },
  shopName: {
    ...Typography.cardTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  metaText: {
    ...Typography.bodyText,
    fontSize: 13,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionBtnText: {
    ...Typography.badgeText,
    fontSize: 12,
    fontWeight: '700',
  },
  vDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});
