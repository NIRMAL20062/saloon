import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';
import { ThemedText } from '@/components/themed-text';

export interface FloatingCartBarProps {
  itemCount: number;
  totalPrice: number;
  ctaText?: string;
  onPress: () => void;
}

export function FloatingCartBar({
  itemCount,
  totalPrice,
  ctaText = 'Select Time Slot',
  onPress,
}: FloatingCartBarProps) {
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');

  if (itemCount <= 0) return null;

  return (
    <View style={styles.outerContainer}>
      <Pressable
        onPress={() => {
          tapFeedback();
          onPress();
        }}
        style={({ pressed }) => [
          styles.container,
          { backgroundColor: tint },
          pressed && styles.pressed,
        ]}>
        {/* Left summary info */}
        <View style={styles.leftCol}>
          <View style={[styles.itemBadge, { backgroundColor: onTint }]}>
            <ThemedText style={[styles.itemBadgeText, { color: tint }]}>{itemCount}</ThemedText>
          </View>

          <View style={styles.textStack}>
            <ThemedText style={[styles.priceText, { color: onTint }]}>₹{totalPrice}</ThemedText>
            <ThemedText style={[styles.subText, { color: onTint, opacity: 0.8 }]}>
              {itemCount} {itemCount === 1 ? 'service' : 'services'} selected
            </ThemedText>
          </View>
        </View>

        {/* Right CTA arrow button */}
        <View style={styles.rightCol}>
          <ThemedText style={[styles.ctaText, { color: onTint }]}>{ctaText}</ThemedText>
          <Ionicons name="arrow-forward" size={18} color={onTint} />
        </View>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 100,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Shadow.glow,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  itemBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBadgeText: {
    ...Typography.badgeText,
    fontWeight: '800',
  },
  textStack: {
    justifyContent: 'center',
  },
  priceText: {
    ...Typography.cardTitle,
    fontWeight: '800',
    fontSize: 16,
  },
  subText: {
    ...Typography.microText,
    fontSize: 11,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaText: {
    ...Typography.badgeText,
    fontWeight: '700',
    fontSize: 14,
  },
});
