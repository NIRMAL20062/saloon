import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/features/auth/auth-provider';
import { fetchShops, type Shop } from '@/features/shops/api';

// Phase 2: browse real shops from the database. No booking action yet —
// tapping a shop only opens its read-only profile (Phase 4 adds booking).
export default function CustomerHomeScreen() {
  const { profile, signOut } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setError(null);
    try {
      setShops(await fetchShops(query));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load shops.');
    }
  }, []);

  useEffect(() => {
    load('').finally(() => setLoading(false));
  }, [load]);

  const onSearchChange = (text: string) => {
    setSearch(text);
    load(text);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(search);
    setRefreshing(false);
  };

  return (
    <ThemedView style={styles.container}>
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

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <FlatList
        data={shops}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <ThemedText style={styles.empty}>No shops found.</ThemedText> : null
        }
        renderItem={({ item }) => (
          <Link href={`/shop/${item.id}`} asChild>
            <Pressable style={styles.card}>
              <ThemedText type="subtitle">{item.name}</ThemedText>
              {item.address ? <ThemedText>{item.address}</ThemedText> : null}
              {/* Rating/distance are placeholders on purpose — reviews land in
                  Phase 6, real geolocation distance in Phase 9. */}
              <ThemedText style={styles.placeholder}>★ New · -- km away</ThemedText>
              <ThemedText style={item.is_open ? styles.open : styles.closed}>
                {item.is_open ? 'Open' : 'Closed'}
              </ThemedText>
            </Pressable>
          </Link>
        )}
      />
    </ThemedView>
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
  list: { gap: 12, paddingBottom: 24 },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, gap: 4 },
  placeholder: { opacity: 0.5, fontSize: 12 },
  open: { color: '#1a7f37' },
  closed: { color: '#c0392b' },
  error: { color: '#c0392b' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
});
