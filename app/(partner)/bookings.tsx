import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BookingCard } from '@/components/booking-card';
import { CardSkeleton } from '@/components/skeleton';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import {
  acceptBooking,
  expireStaleBookings,
  fetchShopBookings,
  rejectBooking,
  type BookingListItem,
} from '@/features/bookings/api';
import { fetchOwnShop } from '@/features/shops/partner-api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export default function PartnerBookingsScreen() {
  const { profile } = useAuth();

  const [shopId, setShopId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [actingAction, setActingAction] = useState<'accept' | 'reject' | null>(null);

  const icon = useThemeColor({}, 'icon');
  const textMuted = useThemeColor({}, 'textMuted');
  const danger = useThemeColor({}, 'danger');

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    try {
      const shop = await fetchOwnShop(profile.id);
      setShopId(shop?.id ?? null);
      if (shop) {
        await expireStaleBookings();
        setBookings(await fetchShopBookings(shop.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load bookings.');
    }
  }, [profile]);

  // Same "refetch on focus" pattern as the customer bookings screen — a
  // partner tabbing back to this screen sees any status change (a booking
  // that expired while they were elsewhere, one a colleague on another
  // device already accepted/rejected) without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    tapFeedback();
    await load();
  }

  async function handleAccept(bookingId: string) {
    setActingOnId(bookingId);
    setActingAction('accept');
    try {
      await acceptBooking(bookingId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept this booking.');
    } finally {
      setActingOnId(null);
      setActingAction(null);
    }
  }

  async function handleReject(bookingId: string) {
    setActingOnId(bookingId);
    setActingAction('reject');
    try {
      await rejectBooking(bookingId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reject this booking.');
    } finally {
      setActingOnId(null);
      setActingAction(null);
    }
  }

  const pending = bookings.filter((b) => b.status === 'awaiting_shop');
  const resolved = bookings.filter((b) => b.status !== 'awaiting_shop');

  if (loading) {
    return (
      <Screen style={{ padding: Spacing.lg }}>
        <CardSkeleton />
        <CardSkeleton />
      </Screen>
    );
  }

  if (!shopId) {
    return (
      <Screen style={styles.center}>
        <ThemedText style={{ color: textMuted }}>Create your shop first to start receiving bookings.</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={20} color={icon} />
        </Pressable>
        <ThemedText type="title" style={styles.screenTitle}>
          Incoming Bookings
        </ThemedText>
      </View>

      {error ? <ThemedText style={{ color: danger }}>{error}</ThemedText> : null}

      <FlatList
        data={[...pending, ...resolved]}
        keyExtractor={(item) => item.id}
        onRefresh={onRefresh}
        refreshing={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListHeaderComponent={
          pending.length > 0 ? (
            <ThemedText style={[styles.sectionLabel, { color: textMuted }]}>
              {pending.length} awaiting your response
            </ThemedText>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={36} color={textMuted} />
            <ThemedText type="caption">No bookings yet.</ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            variant="partner"
            onAccept={() => handleAccept(item.id)}
            onReject={() => handleReject(item.id)}
            accepting={actingOnId === item.id && actingAction === 'accept'}
            rejecting={actingOnId === item.id && actingAction === 'reject'}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  topHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  backButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 22, fontWeight: '800' },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: Spacing.sm },
  list: { paddingBottom: Spacing.xxl },
  emptyState: { alignItems: 'center', gap: Spacing.sm, marginTop: 60 },
});
