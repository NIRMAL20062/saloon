import { Link } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/auth-provider';
import { fetchShops, type Shop } from '@/features/shops/api';
import { distanceKm, getCurrentCoordinates, type Coordinates } from '@/features/shops/geo';

// Phase 2 (+ distance sort pulled forward from Phase 9, see Claude-Context.md):
// browse real shops from the database, nearest-first when location is
// available. No booking action yet — tapping a shop only opens its
// read-only profile (Phase 4 adds booking). Still no map/pins — that visual
// upgrade stays in Phase 9 alongside the actual broadcast-radius logic.
export default function CustomerHomeScreen() {
  const { profile, signOut } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);

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
    setRefreshing(true);
    await Promise.all([load(search), requestLocation()]);
    setRefreshing(false);
  };

  // Sorting happens client-side over the (already server-filtered, RLS-safe)
  // shop list — plenty fast at this scale. Falls back to the server's
  // name-ordering when we don't have a device location yet/at all, rather
  // than blocking the list on a permission prompt.
  const sortedShops = useMemo(() => {
    if (!coords) return shops;
    return [...shops].sort((a, b) => {
      const da = a.lat != null && a.lng != null ? distanceKm(coords, { lat: a.lat, lng: a.lng }) : Infinity;
      const db = b.lat != null && b.lng != null ? distanceKm(coords, { lat: b.lat, lng: b.lng }) : Infinity;
      return da - db;
    });
  }, [shops, coords]);

  return (
    <Screen style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Hi {profile?.full_name ?? 'there'} 👋</ThemedText>
        <Pressable onPress={signOut}>
          <ThemedText type="link">Sign out</ThemedText>
        </Pressable>
      </ThemedView>

      <TextInput
        value={search}
        onChangeText={onSearchChange}
        placeholder="Search shops by name"
        placeholderTextColor="#888"
        style={styles.search}
      />

      {locationDenied ? (
        <Pressable style={styles.locationBanner} onPress={requestLocation} disabled={requestingLocation}>
          <ThemedText style={styles.locationBannerText}>
            {requestingLocation
              ? 'Checking location…'
              : 'Enable location to sort shops by distance — tap to allow'}
          </ThemedText>
        </Pressable>
      ) : null}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <FlatList
        data={sortedShops}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <ThemedText style={styles.empty}>No shops found.</ThemedText> : null
        }
        renderItem={({ item }) => {
          const distance =
            coords && item.lat != null && item.lng != null
              ? distanceKm(coords, { lat: item.lat, lng: item.lng })
              : null;
          return (
            <Link href={`/shop/${item.id}`} asChild>
              <Pressable style={styles.card}>
                <ThemedText type="subtitle">{item.name}</ThemedText>
                {item.address ? <ThemedText>{item.address}</ThemedText> : null}
                {/* Rating is a placeholder on purpose — reviews land in Phase 6. */}
                <ThemedText style={styles.placeholder}>
                  ★ New · {distance != null ? `${distance.toFixed(1)} km away` : '-- km away'}
                </ThemedText>
                <ThemedText style={item.is_open ? styles.open : styles.closed}>
                  {item.is_open ? 'Open' : 'Closed'}
                </ThemedText>
              </Pressable>
            </Link>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  search: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    color: '#111',
  },
  locationBanner: {
    backgroundColor: '#fff7e6',
    borderWidth: 1,
    borderColor: '#f0c36d',
    borderRadius: 8,
    padding: 10,
  },
  locationBannerText: { color: '#8a6100', fontSize: 13 },
  list: { gap: 12, paddingBottom: 24 },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, gap: 4 },
  placeholder: { opacity: 0.5, fontSize: 12 },
  open: { color: '#1a7f37' },
  closed: { color: '#c0392b' },
  error: { color: '#c0392b' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
});
