import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export interface PromoBannerProps {
  title: string;
  subtitle: string;
  badgeLabel?: string;
  ctaText?: string;
  onPress?: () => void;
}

export function PromoBanner({
  title = 'GLIDE PASS',
  subtitle = 'Get 15% OFF your first 3 salon bookings',
  badgeLabel = 'SPECIAL OFFER',
  ctaText = 'Claim Pass',
  onPress,
}: PromoBannerProps) {
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const coral = Colors.light.coral;

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        if (onPress) onPress();
      }}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: coral },
        pressed && styles.pressed,
      ]}>
      <View style={styles.contentCol}>
        {badgeLabel ? (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{badgeLabel}</ThemedText>
          </View>
        ) : null}
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
      </View>

      <View style={styles.ctaPill}>
        <ThemedText style={styles.ctaText}>{ctaText}</ThemedText>
        <Ionicons name="arrow-forward" size={14} color={coral} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  contentCol: {
    flex: 1,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeText: {
    ...Typography.microText,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  title: {
    ...Typography.sectionHeader,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    ...Typography.bodyText,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    gap: 4,
  },
  ctaText: {
    ...Typography.badgeText,
    color: Colors.light.coral,
    fontWeight: '800',
    fontSize: 12,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
