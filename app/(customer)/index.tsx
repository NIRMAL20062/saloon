import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { RadarSearchModal } from '@/components/radar-search-modal';
import { Screen } from '@/components/screen';
import { ShopCard } from '@/components/shop-card';
import { ShopCardSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { fetchShops, type Shop } from '@/features/shops/api';
import { distanceKm, getCurrentCoordinates, type Coordinates } from '@/features/shops/geo';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

const SKELETON_ROWS = [0, 1, 2];

const CATEGORIES = [
  { id: 'haircut', label: 'Haircut' },
  { id: 'beard', label: 'Beard' },
  { id: 'spa', label: 'Head Spa' },
  { id: 'skin', label: 'Facial & Skin' },
  { id: 'color', label: 'Coloring' },
];

export default function CustomerHomeScreen() {
  const { profile, signOut } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [radarModalVisible, setRadarModalVisible] = useState(false);

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);

  const tint = useThemeColor({}, 'tint');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');

  const load = useCallback(async (query: string) => {
    setError(null);
    try {
      setShops(await fetchShops(query));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load shops.');
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setRequestingLocation(true);
    const result = await getCurrentCoordinates();
    setCoords(result);
    setLocationDenied(result === null);
    setRequestingLocation(false);
  }, []);

  useEffect(() => {
    load('').finally(() => setLoading(false));
    requestLocation();
  }, [load, requestLocation]);

  const onSearchChange = (text: string) => {
    setSearch(text);
    load(text);
  };

  const onRefresh = async () => {
    tapFeedback();
    setRefreshing(true);
    await Promise.all([load(search), requestLocation()]);
    setRefreshing(false);
  };

  const sortedShops = useMemo(() => {
    if (!coords) return shops;
    return [...shops].sort((a, b) => {
      const da = a.lat != null && a.lng != null ? distanceKm(coords, { lat: a.lat, lng: a.lng }) : Infinity;
      const db = b.lat != null && b.lng != null ? distanceKm(coords, { lat: b.lat, lng: b.lng }) : Infinity;
      return da - db;
    });
  }, [shops, coords]);

  const renderHeader = () => (
    <View style={styles.feedHeader}>
      {/* Brand Header Line */}
      <View style={styles.brandHeader}>
        <ThemedText style={styles.logoText}>GLIDE</ThemedText>

        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.iconHitArea}
            onPress={() => {
              tapFeedback();
              router.push('/(customer)/bookings');
            }}
            hitSlop={8}>
            <Ionicons name="calendar-outline" size={22} color={textPrimary} />
          </Pressable>
          <Pressable style={styles.iconHitArea} onPress={signOut} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color={textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Location Line — an honest "enable location" nudge when denied,
          rather than silently showing the same fixed label either way. */}
      <Pressable
        style={styles.locationLine}
        disabled={!locationDenied}
        onPress={() => {
          tapFeedback();
          requestLocation();
        }}>
        <Ionicons name="location-sharp" size={14} color={tint} />
        <ThemedText style={[styles.locationText, { color: textMuted }]}>
          {requestingLocation
            ? 'Finding you…'
            : locationDenied
              ? 'Enable location for distances near you'
              : 'Indiranagar 100ft Road · Bengaluru'}
        </ThemedText>
      </Pressable>

      {/* Bold Editorial Greeting */}
      <ThemedText style={styles.heroGreeting}>
        Hey {profile?.full_name?.split(' ')[0] ?? 'there'}. What are you looking for?
      </ThemedText>

      {/* Unbordered Minimal Search Box */}
      <View style={[styles.searchWrap, { borderColor: surfaceBorder }]}>
        <Ionicons name="search-outline" size={18} color={textMuted} style={styles.searchIcon} />
        <ThemedTextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search salons, services..."
          style={styles.searchInput}
        />
        {search ? (
          <Pressable onPress={() => onSearchChange('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* EXPLORE Categories Line */}
      <View style={styles.exploreSection}>
        <ThemedText style={[styles.sectionLabel, { color: textMuted }]}>EXPLORE</ThemedText>
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
                  setSelectedCategory(isSelected ? null : cat.id);
                }}
                style={({ pressed }) => [styles.categoryTextBtn, pressed && styles.pressed]}>
                <ThemedText
                  style={[
                    styles.categoryText,
                    { color: isSelected ? tint : textPrimary },
                    isSelected && styles.categorySelectedText,
                  ]}>
                  {cat.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Instant booking — a single restrained line, not a neon banner, per
          the "quiet luxury" direction, but still a real, reachable entry
          point rather than removed outright. */}
      <Pressable
        onPress={() => {
          tapFeedback();
          setRadarModalVisible(true);
        }}
        style={({ pressed }) => [styles.instantRow, { borderColor: surfaceBorder }, pressed && styles.pressed]}>
        <View style={styles.instantLeft}>
          <Ionicons name="flash-outline" size={16} color={tint} />
          <ThemedText style={styles.instantText}>Need a chair right now?</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={textMuted} />
      </Pressable>

      {/* NEAR YOU Header Line */}
      <View style={styles.sectionHeaderRow}>
        <ThemedText style={styles.sectionTitle}>NEAR YOU</ThemedText>
        <ThemedText style={[styles.seeAllText, { color: tint }]}>See all</ThemedText>
      </View>

      {error ? <ThemedText style={{ color: Colors.light.danger, marginVertical: Spacing.sm }}>{error}</ThemedText> : null}
    </View>
  );

  return (
    <Screen style={styles.container}>
      {loading ? (
        <View style={styles.list}>
          {renderHeader()}
          {SKELETON_ROWS.map((i) => (
            <ShopCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={sortedShops}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <ThemedView style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={32} color={textMuted} />
              <ThemedText type="caption">No salons found matching search.</ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => {
            // No real rating/review data exists yet (reviews land in Phase 6)
            // and distance is only known once we actually have both the
            // device's coords and the shop's — ShopCard shows an honest
            // "New"/"-- km" placeholder rather than a fabricated number when
            // these are omitted, never a guessed value like `4.8`/`0.1 km`.
            const distance =
              coords && item.lat != null && item.lng != null
                ? distanceKm(coords, { lat: item.lat, lng: item.lng })
                : null;

            return (
              <ShopCard
                id={item.id}
                name={item.name}
                address={item.address || 'Indiranagar 100ft Road'}
                distanceKm={distance != null ? parseFloat(distance.toFixed(1)) : undefined}
                isInstantAvailable={item.is_open}
                onPress={() => router.push(`/shop/${item.id}`)}
              />
            );
          }}
        />
      )}

      <RadarSearchModal visible={radarModalVisible} onClose={() => setRadarModalVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  feedHeader: { gap: Spacing.md, marginBottom: Spacing.md },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  logoText: {
    ...Typography.displayHero,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconHitArea: {
    padding: 4,
  },
  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
  },
  locationText: {
    ...Typography.microText,
    fontSize: 12,
    fontWeight: '600',
  },
  heroGreeting: {
    ...Typography.screenTitle,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  searchWrap: {
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 46,
  },
  searchIcon: {
    position: 'absolute',
    left: Spacing.md,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: Spacing.xl + Spacing.md,
    fontSize: 14,
    height: 46,
    borderWidth: 0,
  },
  clearBtn: {
    position: 'absolute',
    right: Spacing.md,
    zIndex: 1,
  },
  exploreSection: {
    marginTop: Spacing.xs,
    gap: 8,
  },
  sectionLabel: {
    ...Typography.sectionHeader,
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  categoryScroll: {
    gap: Spacing.lg,
    paddingVertical: 4,
  },
  categoryTextBtn: {
    paddingVertical: 4,
  },
  categoryText: {
    ...Typography.cardTitle,
    fontSize: 15,
    fontWeight: '600',
  },
  categorySelectedText: {
    fontWeight: '800',
  },
  instantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  instantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instantText: {
    ...Typography.cardTitle,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...Typography.sectionHeader,
    fontSize: 14,
    letterSpacing: 1,
    fontWeight: '800',
  },
  seeAllText: {
    ...Typography.badgeText,
    fontWeight: '700',
  },
  list: { paddingBottom: Spacing.xxl * 2 },
  emptyState: { alignItems: 'center', gap: Spacing.sm, marginTop: 40 },
  pressed: { opacity: 0.8 },
});
