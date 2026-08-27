import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export interface FilterOptions {
  sortBy: 'recommended' | 'distance' | 'rating' | 'price_low';
  minRating: number | null;
  maxDistanceKm: number | null;
  instantOpenOnly: boolean;
}

export interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  initialFilters?: FilterOptions;
}

const DEFAULT_FILTERS: FilterOptions = {
  sortBy: 'recommended',
  minRating: null,
  maxDistanceKm: null,
  instantOpenOnly: false,
};

export function FilterModal({
  visible,
  onClose,
  onApplyFilters,
  initialFilters = DEFAULT_FILTERS,
}: FilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');

  const handleApply = () => {
    tapFeedback();
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    tapFeedback();
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: surface, borderColor: surfaceBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>Filter & Sort</ThemedText>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color={textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Sort By */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Sort By</ThemedText>
              <View style={styles.chipGrid}>
                {[
                  { id: 'recommended', label: 'Recommended' },
                  { id: 'distance', label: 'Nearest First' },
                  { id: 'rating', label: 'Top Rated' },
                  { id: 'price_low', label: 'Price: Low → High' },
                ].map((item) => {
                  const isSelected = filters.sortBy === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        tapFeedback();
                        setFilters({ ...filters, sortBy: item.id as any });
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        { borderColor: surfaceBorder, backgroundColor: isSelected ? tint : surface },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: isSelected ? onTint : textPrimary },
                        ]}>
                        {item.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Rating Filter */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Minimum Rating</ThemedText>
              <View style={styles.chipRow}>
                {[
                  { rating: null, label: 'Any' },
                  { rating: 4.0, label: '4.0+ ★' },
                  { rating: 4.5, label: '4.5+ ★' },
                  { rating: 4.8, label: '4.8+ ★' },
                ].map((item) => {
                  const isSelected = filters.minRating === item.rating;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => {
                        tapFeedback();
                        setFilters({ ...filters, minRating: item.rating });
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        { borderColor: surfaceBorder, backgroundColor: isSelected ? tint : surface },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: isSelected ? onTint : textPrimary },
                        ]}>
                        {item.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Distance Filter */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Maximum Distance</ThemedText>
              <View style={styles.chipRow}>
                {[
                  { dist: null, label: 'Any' },
                  { dist: 1, label: '< 1 km' },
                  { dist: 3, label: '< 3 km' },
                  { dist: 5, label: '< 5 km' },
                ].map((item) => {
                  const isSelected = filters.maxDistanceKm === item.dist;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => {
                        tapFeedback();
                        setFilters({ ...filters, maxDistanceKm: item.dist });
                      }}
                      style={({ pressed }) => [
                        styles.chip,
                        { borderColor: surfaceBorder, backgroundColor: isSelected ? tint : surface },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: isSelected ? onTint : textPrimary },
                        ]}>
                        {item.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Open Now Toggle */}
            <View style={styles.section}>
              <Pressable
                onPress={() => {
                  tapFeedback();
                  setFilters({ ...filters, instantOpenOnly: !filters.instantOpenOnly });
                }}
                style={({ pressed }) => [
                  styles.toggleRow,
                  { borderColor: surfaceBorder },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.toggleLeft}>
                  <Ionicons name="time-outline" size={20} color={Colors.light.success} />
                  <ThemedText style={styles.toggleTitle}>Open Now Only</ThemedText>
                </View>
                <Ionicons
                  name={filters.instantOpenOnly ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={filters.instantOpenOnly ? tint : textMuted}
                />
              </Pressable>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: surfaceBorder }]}>
            <Pressable onPress={handleReset} style={styles.resetBtn}>
              <ThemedText style={[styles.resetText, { color: textMuted }]}>Reset</ThemedText>
            </Pressable>
            <Button title="Apply Filters" onPress={handleApply} style={styles.applyBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.sectionHeader,
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.badgeText,
    fontSize: 13,
    fontWeight: '700',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.badgeText,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleTitle: {
    ...Typography.cardTitle,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  resetBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  resetText: {
    ...Typography.badgeText,
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
