import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';
import { ThemedText } from '@/components/themed-text';

export interface ShopCardProps {
  id: string;
  name: string;
  address: string;
  rating?: number;
  reviewsCount?: number;
  distanceKm?: number;
  imageUrl?: string;
  nextSlotTime?: string;
  servicesList?: string[];
  isInstantAvailable?: boolean;
  onPress: () => void;
}

export function ShopCard({
  name,
  address,
  rating = 4.8,
  reviewsCount = 94,
  distanceKm = 0.1,
  imageUrl,
  nextSlotTime = '10 mins',
  servicesList = ['Haircut', 'Beard Trim'],
  isInstantAvailable = true,
  onPress,
}: ShopCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textMuted = useThemeColor({}, 'textMuted');
  const textPrimary = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const success = useThemeColor({}, 'success');
  const successSurface = useThemeColor({}, 'successSurface');

  const defaultImage =
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80';

  const toggleFavorite = (e: any) => {
    e.stopPropagation();
    tapFeedback();
    setIsFavorite(!isFavorite);
  };

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: surface, borderColor: surfaceBorder },
        pressed && styles.pressed,
      ]}>
      {/* Hero Image Container */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl || defaultImage }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Floating Heart Button */}
        <Pressable onPress={toggleFavorite} style={styles.favoriteButton}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? Colors.light.coral : '#FFFFFF'}
          />
        </Pressable>

        {/* Live Open Tag Pill */}
        <View style={[styles.statusTag, { backgroundColor: isInstantAvailable ? successSurface : surfaceBorder }]}>
          <View style={[styles.statusDot, { backgroundColor: isInstantAvailable ? success : textMuted }]} />
          <ThemedText style={[styles.statusText, { color: isInstantAvailable ? success : textMuted }]}>
            {isInstantAvailable ? 'OPEN NOW' : 'CLOSED'}
          </ThemedText>
        </View>
      </View>

      {/* Premium Content Stack */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText style={styles.shopName} numberOfLines={1}>
            {name}
          </ThemedText>
        </View>

        {/* Rating Pill, Distance & Starting Price Stack */}
        <View style={styles.metaRow}>
          <View style={styles.ratingChip}>
            <Ionicons name="star" size={12} color={Colors.light.mustard} />
            <ThemedText style={styles.ratingText}>{rating.toFixed(1)}</ThemedText>
          </View>

          <ThemedText style={[styles.dot, { color: textMuted }]}>·</ThemedText>
          <ThemedText style={[styles.metaText, { color: textMuted }]}>
            {distanceKm} km
          </ThemedText>
          <ThemedText style={[styles.dot, { color: textMuted }]}>·</ThemedText>
          <ThemedText style={[styles.priceText, { color: textPrimary }]}>
            From ₹300
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTag: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.microText,
    fontWeight: '700',
    fontSize: 10,
  },
  content: {
    padding: Spacing.md,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    ...Typography.cardTitle,
    fontSize: 17,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    ...Typography.badgeText,
    fontWeight: '700',
    fontSize: 13,
  },
  metaText: {
    ...Typography.bodyText,
    fontSize: 13,
  },
  dot: {
    fontSize: 12,
  },
  priceText: {
    ...Typography.bodyText,
    fontSize: 13,
    fontWeight: '700',
  },
});


