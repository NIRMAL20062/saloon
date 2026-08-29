import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { BookingCard } from '@/components/booking-card';
import { BookingDetailsModal } from '@/components/booking-details-modal';
import { Screen } from '@/components/screen';
import { CardSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { expireStaleBookings, fetchMyBookings, type BookingListItem } from '@/features/bookings/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

type FilterType = 'All' | 'Upcoming' | 'Completed' | 'Cancelled' | 'Failed';

const CUSTOMER_PLUM = '#512A45';
const CUSTOMER_BG = '#FBF9F6';
const CARD_BG = '#FFFFFF';
const BORDER_COLOR = '#E2E8F0';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#64748B';

export default function MyBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [selectedBooking, setSelectedBooking] = useState<BookingListItem | null>(null);

  const danger = useThemeColor({}, 'danger');

  const load = useCallback(async () => {
    setError(null);
    try {
      await expireStaleBookings();
      setBookings(await fetchMyBookings());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your bookings.');
    }
  }, []);

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

  // Derived counts for filter chips
  const counts = useMemo(() => {
    const now = Date.now();
    let upcoming = 0;
    let completed = 0;
    let cancelled = 0;
    let failed = 0;

    for (const b of bookings) {
      const isPast = new Date(b.scheduled_at).getTime() < now;
      if (b.payment_status === 'failed') {
        failed++;
      }
      if (b.status === 'confirmed') {
        if (isPast) completed++;
        else upcoming++;
      } else if (b.status === 'awaiting_shop' || b.status === 'payment_pending' || b.status === 'draft') {
        upcoming++;
      } else if (b.status === 'rejected' || b.status === 'expired') {
        cancelled++;
      }
    }

    return {
      All: bookings.length,
      Upcoming: upcoming,
      Completed: completed,
      Cancelled: cancelled,
      Failed: failed,
    };
  }, [bookings]);

  // Filtered lists
  const filteredBookings = useMemo(() => {
    const now = Date.now();
    if (activeFilter === 'All') return bookings;
    if (activeFilter === 'Upcoming') {
      return bookings.filter(
        (b) =>
          (b.status === 'confirmed' && new Date(b.scheduled_at).getTime() >= now) ||
          b.status === 'awaiting_shop' ||
          b.status === 'payment_pending' ||
          b.status === 'draft'
      );
    }
    if (activeFilter === 'Completed') {
      return bookings.filter((b) => b.status === 'confirmed' && new Date(b.scheduled_at).getTime() < now);
    }
    if (activeFilter === 'Cancelled') {
      return bookings.filter((b) => b.status === 'rejected' || b.status === 'expired');
    }
    if (activeFilter === 'Failed') {
      return bookings.filter((b) => b.payment_status === 'failed');
    }
    return bookings;
  }, [bookings, activeFilter]);

  // Split into Upcoming and Past when viewing "All"
  const { upcomingList, pastList } = useMemo(() => {
    const now = Date.now();
    const up: BookingListItem[] = [];
    const past: BookingListItem[] = [];

    for (const b of filteredBookings) {
      const isLiveOrFuture =
        (b.status === 'confirmed' && new Date(b.scheduled_at).getTime() >= now) ||
        b.status === 'awaiting_shop' ||
        b.status === 'payment_pending';
      if (isLiveOrFuture) {
        up.push(b);
      } else {
        past.push(b);
      }
    }

    return { upcomingList: up, pastList: past };
  }, [filteredBookings]);

  const filterTabs: { type: FilterType; label: string; count: number; badgeColor: string; badgeBg: string }[] = [
    { type: 'All', label: 'All', count: counts.All, badgeColor: '#FFFFFF', badgeBg: 'rgba(255,255,255,0.2)' },
    { type: 'Upcoming', label: 'Upcoming', count: counts.Upcoming, badgeColor: '#059669', badgeBg: '#ECFDF5' },
    { type: 'Completed', label: 'Completed', count: counts.Completed, badgeColor: '#2563EB', badgeBg: '#EFF6FF' },
    { type: 'Cancelled', label: 'Cancelled', count: counts.Cancelled, badgeColor: '#EA580C', badgeBg: '#FFF7ED' },
    { type: 'Failed', label: 'Failed', count: counts.Failed, badgeColor: '#4B5563', badgeBg: '#F3F4F6' },
  ];

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        {/* Top Navigation & Filter Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeftGroup}>
            <Pressable
              onPress={() => {
                tapFeedback();
                if (router.canGoBack()) router.back();
                else router.replace('/(customer)');
              }}
              style={styles.backBtn}
              hitSlop={12}>
              <Ionicons name="arrow-back" size={20} color={TEXT_DARK} />
            </Pressable>
            <View style={styles.headerTitleCol}>
              <ThemedText style={styles.screenTitle}>My Bookings</ThemedText>
              <ThemedText style={styles.screenSubtitle}>Manage and track all your appointments</ThemedText>
            </View>
          </View>

          {/* Filter Button */}
          <Pressable
            onPress={() => {
              tapFeedback();
              // Cycle through or open filter action
            }}
            style={styles.filterPillBtn}>
            <Ionicons name="options-outline" size={16} color={TEXT_DARK} />
            <ThemedText style={styles.filterPillText}>Filter</ThemedText>
          </Pressable>
        </View>

        {/* Filter Tabs Chips Scroll */}
        <View style={styles.filterScrollViewWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContainer}>
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.type;
              return (
                <Pressable
                  key={tab.type}
                  onPress={() => {
                    tapFeedback();
                    setActiveFilter(tab.type);
                  }}
                  style={[
                    styles.filterChip,
                    isActive ? styles.filterChipActive : styles.filterChipInactive,
                  ]}>
                  <ThemedText
                    style={[
                      styles.filterChipLabel,
                      isActive ? styles.filterChipLabelActive : styles.filterChipLabelInactive,
                    ]}>
                    {tab.label}
                  </ThemedText>

                  {/* Badge Counter */}
                  <View
                    style={[
                      styles.filterBadge,
                      {
                        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : tab.badgeBg,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.filterBadgeText,
                        { color: isActive ? '#FFFFFF' : tab.badgeColor },
                      ]}>
                      {tab.count}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {error ? <ThemedText style={[styles.errorText, { color: danger }]}>{error}</ThemedText> : null}

        {/* List Content */}
        {loading ? (
          <View style={styles.skeletonContainer}>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={32} color={CUSTOMER_PLUM} />
            </View>
            <ThemedText style={styles.emptyTitle}>No bookings found</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              {activeFilter === 'All'
                ? 'You have not booked any salon appointments yet.'
                : `You have no ${activeFilter.toLowerCase()} appointments.`}
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CUSTOMER_PLUM} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}>
            {activeFilter === 'All' ? (
              <View style={styles.sectionsContainer}>
                {/* Upcoming Bookings Section */}
                {upcomingList.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <ThemedText style={styles.sectionHeaderTitle}>Upcoming Bookings</ThemedText>
                    <View style={styles.cardsStack}>
                      {upcomingList.map((b) => (
                        <BookingCard
                          key={b.id}
                          booking={b}
                          variant="customer"
                          onViewDetails={() => setSelectedBooking(b)}
                          onPayNow={() => router.push(`/pay/${b.id}`)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Past Bookings Section */}
                {pastList.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <ThemedText style={styles.sectionHeaderTitle}>Past Bookings</ThemedText>
                    <View style={styles.cardsStack}>
                      {pastList.map((b) => (
                        <BookingCard
                          key={b.id}
                          booking={b}
                          variant="customer"
                          onViewDetails={() => setSelectedBooking(b)}
                          onPayNow={() => router.push(`/pay/${b.id}`)}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.sectionBlock}>
                <ThemedText style={styles.sectionHeaderTitle}>{activeFilter} Bookings</ThemedText>
                <View style={styles.cardsStack}>
                  {filteredBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      variant="customer"
                      onViewDetails={() => setSelectedBooking(b)}
                      onPayNow={() => router.push(`/pay/${b.id}`)}
                    />
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        visible={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onPayNow={(bookingId) => router.push(`/pay/${bookingId}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CUSTOMER_BG,
  },
  container: {
    flex: 1,
    paddingTop: Spacing.sm,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerTitleCol: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },
  screenSubtitle: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    fontWeight: '500',
    marginTop: 1,
  },
  filterPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  /* Filter Chips */
  filterScrollViewWrapper: {
    marginBottom: Spacing.md,
  },
  filterChipsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 7,
  },
  filterChipActive: {
    backgroundColor: '#201A1D', // Noir/Deep Plum active state
    shadowColor: '#201A1D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipInactive: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipLabelActive: {
    color: '#FFFFFF',
  },
  filterChipLabelInactive: {
    color: '#475569',
  },
  filterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Lists & Sections */
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 80,
  },
  sectionsContainer: {
    gap: 20,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#3D1E33', // Deep luxury plum heading
    letterSpacing: 0.2,
    marginLeft: 2,
  },
  cardsStack: {
    gap: 12,
  },

  /* Skeleton & Empty */
  skeletonContainer: {
    paddingHorizontal: Spacing.lg,
    gap: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    gap: 10,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3EBF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT_DARK,
  },
  emptySubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: Spacing.lg,
    marginBottom: 8,
  },
});
