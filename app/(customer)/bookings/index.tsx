import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BookingCard } from '@/components/booking-card';
import { Screen } from '@/components/screen';
import { CardSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { expireStaleBookings, fetchMyBookings, type BookingListItem } from '@/features/bookings/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export default function MyBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const icon = useThemeColor({}, 'icon');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textMuted = useThemeColor({}, 'textMuted');
  const danger = useThemeColor({}, 'danger');

  const load = useCallback(async () => {
    setError(null);
    try {
      // Opportunistic sweep (CLAUDE.md's "simple polling check") before
      // reading the list, so a booking whose response window already lapsed
      // shows as `expired` instead of a stale `awaiting_shop`.
      await expireStaleBookings();
      setBookings(await fetchMyBookings());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your bookings.');
    }
  }, []);

  // Re-fetches every time this screen regains focus (e.g. coming back from
  // the booking-review screen after submitting, or after a shop
  // accepts/rejects while the app was backgrounded) — a reasonable stand-in
  // for the live updates Phase 8's Realtime subscriptions add properly.
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    tapFeedback();
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            tapFeedback();
            if (router.canGoBack()) router.back();
            else router.replace('/(customer)');
          }}
          style={[styles.backBtn, { borderColor: surfaceBorder }]}
          hitSlop={12}>
          <Ionicons name="arrow-back" size={20} color={icon} />
        </Pressable>
        <ThemedText type="title" style={styles.screenTitle}>
          My Bookings
        </ThemedText>
      </View>

      {error ? <ThemedText style={{ color: danger, marginBottom: Spacing.sm }}>{error}</ThemedText> : null}

      {loading ? (
        <View style={{ gap: Spacing.md }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={36} color={textMuted} />
              <ThemedText type="caption">No bookings yet — book a slot from a shop&apos;s page.</ThemedText>
            </View>
          }
          renderItem={({ item }) => <BookingCard booking={item} variant="customer" />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 22, fontWeight: '800' },
  list: { paddingBottom: Spacing.xxl },
  emptyState: { alignItems: 'center', gap: Spacing.sm, marginTop: 60 },
});
