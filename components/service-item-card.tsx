import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';
import { ThemedText } from '@/components/themed-text';

export interface ServiceItemProps {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  description?: string;
  isPopular?: boolean;
  imageUrl?: string;
  quantity?: number;
  onAdd: () => void;
  onRemove?: () => void;
}

export function ServiceItemCard({
  name,
  price,
  durationMin,
  description,
  isPopular = false,
  imageUrl,
  quantity = 0,
  onAdd,
  onRemove,
}: ServiceItemProps) {
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const tintSurface = useThemeColor({}, 'tintSurface');
  const accent = useThemeColor({}, 'accent');
  const accentSurface = useThemeColor({}, 'accentSurface');

  const defaultImage =
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=400&q=80';

  const handleAdd = () => {
    tapFeedback();
    onAdd();
  };

  const handleRemove = () => {
    tapFeedback();
    if (onRemove) onRemove();
  };

  return (
    <View style={[styles.container, { backgroundColor: surface, borderColor: surfaceBorder }]}>
      {/* Left Info Column */}
      <View style={styles.infoCol}>
        {isPopular && (
          <View style={[styles.popularBadge, { backgroundColor: accentSurface }]}>
            <Ionicons name="sparkles" size={10} color={accent} />
            <ThemedText style={[styles.popularText, { color: accent }]}>POPULAR</ThemedText>
          </View>
        )}

        <ThemedText style={styles.title}>{name}</ThemedText>

        <View style={styles.metaRow}>
          <ThemedText style={styles.price}>₹{price}</ThemedText>
          <ThemedText style={[styles.dot, { color: textMuted }]}>•</ThemedText>
          <View style={styles.durationPill}>
            <Ionicons name="time-outline" size={12} color={textMuted} />
            <ThemedText style={[styles.durationText, { color: textMuted }]}>
              {durationMin} mins
            </ThemedText>
          </View>
        </View>

        {description ? (
          <ThemedText style={[styles.description, { color: textMuted }]} numberOfLines={2}>
            {description}
          </ThemedText>
        ) : null}
      </View>

      {/* Right Image & Action Col */}
      <View style={styles.rightCol}>
        <Image
          source={{ uri: imageUrl || defaultImage }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Floating Action Pill */}
        <View style={styles.actionContainer}>
          {quantity > 0 ? (
            <View style={[styles.counterPill, { backgroundColor: tint, borderColor: tint }]}>
              <Pressable onPress={handleRemove} style={styles.counterBtn}>
                <Ionicons name="remove" size={14} color="#FFF" />
              </Pressable>

              <ThemedText style={styles.counterValue}>{quantity}</ThemedText>

              <Pressable onPress={handleAdd} style={styles.counterBtn}>
                <Ionicons name="add" size={14} color="#FFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleAdd}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: surface, borderColor: tint },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.addBtnText, { color: tint }]}>+ ADD</ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.sm,
  },
  infoCol: {
    flex: 1,
    paddingRight: Spacing.md,
    gap: Spacing.xs,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    gap: 4,
    marginBottom: 2,
  },
  popularText: {
    ...Typography.microText,
    fontSize: 9,
    fontWeight: '700',
  },
  title: {
    ...Typography.cardTitle,
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    ...Typography.cardTitle,
    fontSize: 16,
    fontWeight: '700',
  },
  dot: {
    fontSize: 12,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    ...Typography.badgeText,
    fontWeight: '500',
  },
  description: {
    ...Typography.bodyText,
    fontSize: 12,
    marginTop: 2,
  },
  rightCol: {
    width: 96,
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: Radius.md,
    backgroundColor: '#E2E8F0',
  },
  actionContainer: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    ...Shadow.card,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  addBtnText: {
    ...Typography.badgeText,
    fontWeight: '800',
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    gap: 8,
  },
  counterBtn: {
    padding: 2,
  },
  counterValue: {
    color: '#FFF',
    ...Typography.badgeText,
    fontWeight: '700',
  },
});
