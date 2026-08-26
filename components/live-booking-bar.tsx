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
  const success = useThemeColor({}, 'success');

  const handlePress = () => {
    tapFeedback();
    if (onPressDetails) {
      onPressDetails();
    } else {
      // Default navigation to booking status/tracker view
      router.push({ pathname: '/(customer)', params: { activeBooking: bookingId } });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, Shadow.glow, pressed && styles.pressed]}>
      <View style={styles.contentRow}>
        <View style={styles.statusGroup}>
          <View style={styles.pulseContainer}>
            <View style={[styles.pulseDot, { backgroundColor: success }]} />
          </View>
          <View style={styles.textGroup}>
            <View style={styles.statusHeaderRow}>
              <ThemedText style={styles.statusLabel}>{statusLabel}</ThemedText>
              <ThemedText style={styles.dotSeparator}>•</ThemedText>
              <ThemedText style={styles.timeText}>{slotTime}</ThemedText>
            </View>
            <ThemedText style={styles.shopName} numberOfLines={1}>
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
    backgroundColor: '#0F172A',
    borderColor: '#6366F1',
    borderWidth: 1.5,
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dotSeparator: {
    color: '#64748B',
    fontSize: 10,
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  shopName: {
    color: '#F8FAFC',
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
