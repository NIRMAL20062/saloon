import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export interface LookbookItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  tag: string;
}

export interface LookbookCardProps {
  item: LookbookItem;
  onPress?: () => void;
}

export function LookbookCard({ item, onPress }: LookbookCardProps) {
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        if (onPress) onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface, borderColor: surfaceBorder },
        pressed && styles.pressed,
      ]}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={[styles.badge, { backgroundColor: Colors.light.mustard }]}>
          <ThemedText style={styles.badgeText}>{item.tag}</ThemedText>
        </View>
      </View>

      <View style={styles.infoStack}>
        <ThemedText style={[styles.categoryText, { color: textMuted }]}>
          {item.category.toUpperCase()}
        </ThemedText>
        <ThemedText style={[styles.titleText, { color: textPrimary }]} numberOfLines={1}>
          {item.title}
        </ThemedText>
        <View style={styles.actionRow}>
          <ThemedText style={[styles.bookText, { color: tint }]}>Explore Salons</ThemedText>
          <Ionicons name="arrow-forward" size={14} color={tint} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    marginRight: Spacing.md,
  },
  imageWrap: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: Spacing.xs + 2,
    left: Spacing.xs + 2,
    paddingHorizontal: Spacing.xs + 4,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeText: {
    ...Typography.microText,
    color: '#201A1D',
    fontWeight: '800',
    fontSize: 9,
  },
  infoStack: {
    padding: Spacing.md,
    gap: 3,
  },
  categoryText: {
    ...Typography.microTracked,
    fontSize: 9,
  },
  titleText: {
    ...Typography.cardTitle,
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  bookText: {
    ...Typography.badgeText,
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
