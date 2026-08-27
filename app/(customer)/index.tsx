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
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { fetchShops, type Shop } from '@/features/shops/api';
import {
  distanceKm,
  getCurrentCoordinates,
  getLocationPermissionStatus,
  type Coordinates,
} from '@/features/shops/geo';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

const SKELETON_ROWS = [0, 1, 2];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'haircut', label: 'Haircut' },
  { id: 'beard', label: 'Beard' },
  { id: 'spa', label: 'Head Spa' },
  { id: 'facial', label: 'Facial' },
  { id: 'color', label: 'Hair Color' },
  { id: 'styling', label: 'Styling' },
];

export default function CustomerHomeScreen() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [radarModalVisible, setRadarModalVisible] = useState(false);

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [showLocationPriming, setShowLocationPriming] = useState(false);

  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const warningSurface = useThemeColor({}, 'warningSurface');
  const warning = useThemeColor({}, 'warning');

  const load = useCallback(async (query: string) => {
    setError(null);
    try {
      setShops(await fetchShops(query));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load shops.');
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setShowLocationPriming(false);
    setRequestingLocation(true);
    const result = await getCurrentCoordinates();
    setCoords(result);
    setLocationDenied(result === null);
    setRequestingLocation(false);
  }, []);

  useEffect(() => {
    load('').finally(() => setLoading(false));

    getLocationPermissionStatus().then((status) => {
      if (status === 'granted') {
        requestLocation();
      } else if (status === 'denied') {
        setLocationDenied(true);
      } else {
        setShowLocationPriming(true);
      }
    });
  }, [load, requestLocation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  const onSearchChange = (text: string) => {
    setSearch(text);
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
      {/* Location Bar & Navigation Row */}
      <View style={styles.topNavRow}>
        <Pressable
          style={styles.locationSelector}
          disabled={!locationDenied}
          onPress={() => {
            tapFeedback();
            requestLocation();
          }}>
          <Ionicons name="location-sharp" size={18} color={tint} />
          <View style={styles.locationCol}>
            <ThemedText style={[styles.locationLabel, { color: textMuted }]}>LOCATION</ThemedText>
            <ThemedText style={styles.locationValue} numberOfLines={1}>
              {requestingLocation
                ? 'Locating...'
                : locationDenied
                  ? 'Enable location'
                  : 'Indiranagar, Bengaluru ▾'}
            </ThemedText>
          </View>
        </Pressable>

        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.iconCircle}
            onPress={() => {
              tapFeedback();
              router.push('/(customer)/saved');
            }}>
            <Ionicons name="heart-outline" size={20} color={textPrimary} />
          </Pressable>

          <Pressable
            style={styles.iconCircle}
            onPress={() => {
              tapFeedback();
              router.push('/(customer)/profile');
            }}>
            <Ionicons name="person-outline" size={19} color={textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Hero Heading */}
      <View style={styles.heroTextCol}>
        <ThemedText style={styles.heroTitle}>
          Find your next look.
        </ThemedText>
        <ThemedText style={[styles.heroSubtitle, { color: textMuted }]}>
          Discover top salons, barbers and services around you.
        </ThemedText>
      </View>

      {/* Premium Search Input Box */}
      <View style={[styles.searchBox, { backgroundColor: surface, borderColor: surfaceBorder }]}>
        <Ionicons name="search-outline" size={20} color={textMuted} style={styles.searchIcon} />
        <ThemedTextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search salons, services, hairstyles..."
          style={styles.searchInput}
        />
        {search ? (
          <Pressable onPress={() => onSearchChange('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Instant Barber Match Action Card */}
      <Pressable
        onPress={() => {
          tapFeedback();
          setRadarModalVisible(true);
        }}
        style={({ pressed }) => [
          styles.instantCard,
          { backgroundColor: Colors.light.primaryBrand, borderColor: Colors.light.primaryBrand },
          pressed && styles.pressed,
        ]}>
        <View style={styles.instantLeft}>
          <View style={[styles.flashIconCircle, { backgroundColor: 'rgba(231, 196, 90, 0.2)' }]}>
            <Ionicons name="flash" size={18} color={Colors.light.mustard} />
          </View>
          <View style={styles.instantCol}>
            <ThemedText style={[styles.instantTitle, { color: '#FFFFFF' }]}>⚡ Find a barber now</ThemedText>
            <ThemedText style={[styles.instantSub, { color: 'rgba(255, 255, 255, 0.8)' }]}>
              Instant match · Salons open near you
            </ThemedText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </Pressable>

      {/* Location Priming Banner */}
      {showLocationPriming ? (
        <View style={[styles.primingCard, { backgroundColor: surface, borderColor: surfaceBorder }]}>
          <Ionicons name="navigate-circle-outline" size={22} color={tint} />
          <View style={styles.primingTextCol}>
            <ThemedText style={styles.primingTitle}>See salons near you</ThemedText>
            <ThemedText style={[styles.primingSub, { color: textMuted }]}>
              Used strictly to calculate distance to nearby shops.
            </ThemedText>
          </View>
          <Pressable
            onPress={requestLocation}
            disabled={requestingLocation}
            style={({ pressed }) => [styles.primingBtn, { backgroundColor: tint }, pressed && styles.pressed]}>
            <ThemedText style={styles.primingBtnText}>
              {requestingLocation ? '...' : 'Allow'}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/* Location Permission Denied Banner */}
      {locationDenied && !showLocationPriming ? (
        <Pressable
          style={[styles.locationBanner, { backgroundColor: warningSurface }]}
          onPress={requestLocation}
          disabled={requestingLocation}>
          <Ionicons name="location-outline" size={18} color={warning} />
          <ThemedText style={[styles.locationBannerText, { color: warning }]}>
            {requestingLocation
              ? 'Checking location...'
              : 'Enable location to sort salons by distance — tap to enable'}
          </ThemedText>
        </Pressable>
      ) : null}

      {/* Category Horizontal Scroll Row */}
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
                  isSelected && styles.categorySelectedText,
                ]}>
                {cat.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Nearby Salons Header */}
      <View style={styles.sectionHeaderRow}>
        <ThemedText style={styles.sectionTitle}>Nearby Salons</ThemedText>
        <Pressable onPress={() => router.push('/(customer)/explore')}>
          <ThemedText style={[styles.seeAllText, { color: tint }]}>View All</ThemedText>
        </Pressable>
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
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={36} color={textMuted} />
              <ThemedText style={[styles.emptyText, { color: textMuted }]}>
                No salons found in this region.
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => {
            const distance =
              coords && item.lat != null && item.lng != null
                ? distanceKm(coords, { lat: item.lat, lng: item.lng })
                : null;

            return (
              <ShopCard
                id={item.id}
                name={item.name}
                address={item.address || 'Indiranagar 100ft Road'}
                rating={4.8}
                reviewsCount={86}
                distanceKm={distance != null ? parseFloat(distance.toFixed(1)) : undefined}
                isInstantAvailable={item.is_open}
                onPress={() => router.push(`/shop/${item.id}`)}
              />
            );
          }}
        />
      )}

      {/* Instant Barber Match Modal */}
      <RadarSearchModal
        visible={radarModalVisible}
        onClose={() => setRadarModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  feedHeader: { gap: Spacing.md, marginBottom: Spacing.md, paddingTop: Spacing.xs },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  locationCol: { gap: 0 },
  locationLabel: { ...Typography.microTracked, fontSize: 9, fontWeight: '800' },
  locationValue: { ...Typography.cardTitle, fontSize: 14, fontWeight: '700' },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    marginTop: Spacing.xs,
    gap: 4,
  },
  heroTitle: {
    ...Typography.displayHero,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    ...Typography.bodyText,
    fontSize: 14,
  },
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
  instantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  instantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  flashIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instantCol: { gap: 2 },
  instantTitle: { ...Typography.cardTitle, fontSize: 14, fontWeight: '700' },
  instantSub: { ...Typography.microText, fontSize: 11 },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  locationBannerText: { fontSize: 12, flex: 1 },
  primingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  primingTextCol: { flex: 1, gap: 2 },
  primingTitle: { ...Typography.cardTitle, fontSize: 14, fontWeight: '700' },
  primingSub: { ...Typography.microText, fontSize: 11 },
  primingBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
  },
  primingBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  categoryScroll: {
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  categoryText: {
    ...Typography.badgeText,
    fontSize: 13,
    fontWeight: '600',
  },
  categorySelectedText: {
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.sectionHeader,
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllText: {
    ...Typography.badgeText,
    fontSize: 13,
    fontWeight: '700',
  },
  list: { paddingBottom: 100 },
  emptyState: { alignItems: 'center', gap: Spacing.sm, marginTop: 40 },
  emptyText: { ...Typography.bodyText },
  pressed: { opacity: 0.8 },
});
