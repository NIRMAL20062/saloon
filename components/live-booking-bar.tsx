import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export interface LiveBookingBarProps {
  bookingId?: string;
  shopName?: string;
  slotTime?: string;
  statusLabel?: string;
  onPressDetails?: () => void;
}

export function LiveBookingBar({
  bookingId = 'GLIDE-8942',
  shopName = 'The Grooming Station',
  slotTime = 'Today, 05:00 PM',
  statusLabel = 'Shop Accepted',
  onPressDetails,
}: LiveBookingBarProps) {
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const success = useThemeColor({}, 'success');

  const handlePress = () => {
    tapFeedback();
    if (onPressDetails) {
      onPressDetails();
    } else {
      router.push({ pathname: '/(customer)', params: { activeBooking: bookingId } });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: surface, borderColor: surfaceBorder },
        Shadow.glow,
        pressed && styles.pressed,
      ]}>
      <View style={styles.contentRow}>
        <View style={styles.statusGroup}>
          <View style={styles.pulseContainer}>
            <View style={[styles.pulseDot, { backgroundColor: success }]} />
          </View>
          <View style={styles.textGroup}>
            <View style={styles.statusHeaderRow}>
              <ThemedText style={[styles.statusLabel, { color: success }]}>{statusLabel}</ThemedText>
              <ThemedText style={[styles.dotSeparator, { color: textMuted }]}>•</ThemedText>
              <ThemedText style={[styles.timeText, { color: textMuted }]}>{slotTime}</ThemedText>
            </View>
            <ThemedText style={[styles.shopName, { color: textPrimary }]} numberOfLines={1}>
              {shopName}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.qrBadge, { backgroundColor: tint }]}>
          <Ionicons name="qr-code-sharp" size={16} color={onTint} />
          <ThemedText style={[styles.qrBadgeText, { color: onTint }]}>View QR</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    zIndex: 999,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  pulseContainer: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(85, 214, 138, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dotSeparator: {
    fontSize: 10,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shopName: {
    fontSize: 14,
    fontWeight: '700',
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    gap: 6,
  },
  qrBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
