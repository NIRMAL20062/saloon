import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  iconName = 'sparkles-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: surface, borderColor: surfaceBorder }]}>
        <Ionicons name={iconName} size={32} color={tint} />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={[styles.description, { color: textMuted }]}>{description}</ThemedText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={() => {
            tapFeedback();
            onAction();
          }}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: tint },
            pressed && styles.pressed,
          ]}>
          <ThemedText style={[styles.actionBtnText, { color: onTint }]}>{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.sectionHeader,
    fontSize: 17,
    textAlign: 'center',
  },
  description: {
    ...Typography.bodyText,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  actionBtnText: {
    ...Typography.badgeText,
    fontWeight: '700',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
