import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { ShopCard } from '@/components/shop-card';
import { ShopCardSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { EmptyState } from '@/components/empty-state';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { fetchShops, type Shop } from '@/features/shops/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'haircut', label: 'Haircut' },
  { id: 'beard', label: 'Beard' },
  { id: 'spa', label: 'Head Spa' },
  { id: 'facial', label: 'Facial' },
  { id: 'color', label: 'Coloring' },
  { id: 'styling', label: 'Styling' },
];

const RECENT_SEARCHES = ['Fade Haircut', 'Beard Trim', 'Indiranagar Spa', 'Head Massage'];

export default function ExploreScreen() {
  const [search, setSearch] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textPrimary = useThemeColor({}, 'text');

  const loadShops = useCallback(async (query: string) => {
    setLoading(true);
    try {
      setShops(await fetchShops(query));
    } catch {
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadShops(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadShops]);

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.screenTitle}>Explore</ThemedText>
        <ThemedText style={[styles.subTitle, { color: textMuted }]}>
          Discover salons, services, and barbers around you
        </ThemedText>

        {/* Search Field */}
        <View style={[styles.searchBox, { backgroundColor: surface, borderColor: surfaceBorder }]}>
          <Ionicons name="search-outline" size={20} color={textMuted} style={styles.searchIcon} />
          <ThemedTextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search salons, services, hairstyles..."
            style={styles.searchInput}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Category Scroll Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = cat.id === selectedCategory;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  tapFeedback();
                  setSelectedCategory(cat.id);
                }}
                style={({ pressed }) => [
                  styles.categoryChip,
                  { backgroundColor: surface, borderColor: surfaceBorder },
                  isSelected && { backgroundColor: tint, borderColor: tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  style={[
                    styles.categoryText,
                    { color: isSelected ? onTint : textPrimary },
                  ]}>
                  {cat.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {!search && (
          <View style={styles.recentSection}>
            <ThemedText style={[styles.sectionTitle, { color: textMuted }]}>RECENT SEARCHES</ThemedText>
            <View style={styles.recentWrap}>
              {RECENT_SEARCHES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setSearch(item)}
                  style={({ pressed }) => [
                    styles.recentTag,
                    { backgroundColor: surface, borderColor: surfaceBorder },
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons name="time-outline" size={13} color={textMuted} />
                  <ThemedText style={styles.recentText}>{item}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Results List */}
      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <ShopCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              iconName="search-outline"
              title="No Salons Found"
              description="Try adjusting your search terms or filters to find salons nearby."
              actionLabel="Clear Search"
              onAction={() => setSearch('')}
            />
          }
          renderItem={({ item }) => (
            // No real rating data exists yet (reviews land in Phase 6) and
            // this screen doesn't have the device's coordinates to compute a
            // real distance — ShopCard shows an honest "New"/"-- km"
            // placeholder rather than the same fabricated 4.8/0.1km for
            // every shop when these are omitted.
            <ShopCard
              id={item.id}
              name={item.name}
              address={item.address || 'Indiranagar 100ft Road'}
              isInstantAvailable={item.is_open}
              onPress={() => router.push(`/shop/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  header: { gap: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.md },
  screenTitle: { ...Typography.screenTitle, fontSize: 26 },
  subTitle: { ...Typography.bodyText, fontSize: 13, marginTop: -4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: { marginRight: Spacing.xs },
  searchInput: { flex: 1, fontSize: 14, height: 48, borderWidth: 0 },
  clearBtn: { padding: 4 },
  categoryScroll: { gap: Spacing.sm, paddingVertical: 4 },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  categoryText: { ...Typography.badgeText, fontWeight: '700' },
  recentSection: { gap: Spacing.xs, marginTop: Spacing.xs },
  sectionTitle: { ...Typography.microTracked, fontSize: 11 },
  recentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  recentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  recentText: { ...Typography.bodyText, fontSize: 12 },
  list: { paddingBottom: 100 },
  pressed: { opacity: 0.8 },
});
