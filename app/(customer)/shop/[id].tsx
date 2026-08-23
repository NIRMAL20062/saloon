import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchShopDetail, type Barber, type Service, type Shop } from '@/features/shops/api';

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchShopDetail(id)
      .then((result) => {
        if (!isMounted) return;
        setShop(result.shop);
        setServices(result.services);
        setBarbers(result.barbers);
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof Error ? e.message : 'Could not load this shop.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error || !shop) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.error}>{error ?? 'Shop not found.'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: shop.name }} />
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">{shop.name}</ThemedText>
        {shop.address ? <ThemedText>{shop.address}</ThemedText> : null}
        <ThemedText style={shop.is_open ? styles.open : styles.closed}>
          {shop.is_open ? 'Open' : 'Closed'}
        </ThemedText>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Services
        </ThemedText>
        {services.length === 0 ? (
          <ThemedText style={styles.empty}>No services listed yet.</ThemedText>
        ) : (
          services.map((s) => (
            <ThemedView key={s.id} style={styles.row}>
              <ThemedText>{s.name}</ThemedText>
              <ThemedText>
                ₹{(s.price / 100).toFixed(0)} · {s.duration_min} min
              </ThemedText>
            </ThemedView>
          ))
        )}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Barbers
        </ThemedText>
        {barbers.length === 0 ? (
          <ThemedText style={styles.empty}>No barbers listed yet.</ThemedText>
        ) : (
          barbers.map((b) => (
            <ThemedView key={b.id} style={styles.row}>
              <ThemedText>{b.name}</ThemedText>
            </ThemedView>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginTop: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  open: { color: '#1a7f37' },
  closed: { color: '#c0392b' },
  error: { color: '#c0392b' },
  empty: { opacity: 0.6 },
});
