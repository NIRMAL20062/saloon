import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface ReviewItem {
  id: string;
  authorName: string;
  rating: number;
  dateText: string;
  serviceName: string;
  comment: string;
}

export function ReviewCard({ authorName, rating, dateText, serviceName, comment }: ReviewItem) {
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: surfaceBorder }]}>
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: tint }]}>
            <ThemedText style={styles.avatarText}>{authorName.charAt(0)}</ThemedText>
          </View>
          <View style={styles.authorInfo}>
            <ThemedText style={[styles.authorName, { color: textPrimary }]}>{authorName}</ThemedText>
            <ThemedText style={[styles.serviceTag, { color: textMuted }]}>{serviceName}</ThemedText>
          </View>
        </View>

        <View style={styles.ratingBox}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= rating ? 'star' : 'star-outline'}
                size={12}
                color={Colors.light.mustard}
              />
            ))}
          </View>
          <ThemedText style={[styles.dateText, { color: textMuted }]}>{dateText}</ThemedText>
        </View>
      </View>

      <ThemedText style={[styles.commentText, { color: textPrimary }]}>{comment}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  authorInfo: {
    gap: 1,
  },
  authorName: {
    ...Typography.cardTitle,
    fontSize: 14,
  },
  serviceTag: {
    ...Typography.microText,
    fontSize: 11,
  },
  ratingBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dateText: {
    ...Typography.microText,
    fontSize: 10,
  },
  commentText: {
    ...Typography.bodyText,
    fontSize: 13,
    lineHeight: 18,
  },
});
