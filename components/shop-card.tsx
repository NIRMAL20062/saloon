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
  const accent = useThemeColor({}, 'accent');
  const success = useThemeColor({}, 'success');

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
        pressed && styles.pressed,
      ]}>
      {/* Clean Edge Hero Photo — Uncluttered */}
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
            color={isFavorite ? accent : '#FFF'}
          />
        </Pressable>
      </View>

      {/* Editorial Product Meta — Positioned Cleanly Below Photo */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText style={styles.shopName} numberOfLines={1}>
            {name.toUpperCase()}
          </ThemedText>

          {/* Minimal Open Status Dot */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isInstantAvailable ? success : textMuted }]} />
            <ThemedText style={[styles.statusText, { color: isInstantAvailable ? success : textMuted }]}>
              {isInstantAvailable ? 'OPEN' : 'CLOSED'}
            </ThemedText>
          </View>
        </View>

        {/* Rating, Distance & Starting Price */}
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <ThemedText style={styles.metaText}>
            {rating.toFixed(1)}
          </ThemedText>
          <ThemedText style={[styles.dot, { color: textMuted }]}>·</ThemedText>
          <ThemedText style={[styles.metaText, { color: textMuted }]}>
            {distanceKm} km
          </ThemedText>
          <ThemedText style={[styles.dot, { color: textMuted }]}>·</ThemedText>
          <ThemedText style={styles.priceText}>
            Haircut from ₹300
          </ThemedText>
        </View>

        <View style={[styles.hairline, { backgroundColor: surfaceBorder }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  pressed: {
    opacity: 0.9,
  },
  imageContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#1E222D',
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
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: Spacing.md,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    ...Typography.cardTitle,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.microText,
    fontWeight: '800',
    fontSize: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    ...Typography.bodyText,
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {
    fontSize: 14,
  },
  priceText: {
    ...Typography.bodyText,
    fontSize: 13,
    fontWeight: '700',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.md,
  },
});
