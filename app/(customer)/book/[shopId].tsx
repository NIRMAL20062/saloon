import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { SlotPicker, type TimeSlot } from '@/components/slot-picker';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { createBooking, fetchBarberBusyWindows, type BusyWindow } from '@/features/bookings/api';
import { buildDayOptions, buildTimeSlots } from '@/features/bookings/slots';
import { fetchShopDetail, type Barber, type Service, type Shop } from '@/features/shops/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';
import { BOOKING_BUFFER_MINUTES } from '@/supabase/functions/_shared/booking-logic';

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

export default function BookSlotScreen() {
  const { shopId, barberId, serviceIds } = useLocalSearchParams<{
    shopId: string;
    barberId: string;
    serviceIds: string;
  }>();

  const selectedServiceIds = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(serviceIds ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }, [serviceIds]);

  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(() => buildDayOptions()[0].dateString);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busyWindows, setBusyWindows] = useState<BusyWindow[]>([]);

  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const icon = useThemeColor({}, 'icon');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textMuted = useThemeColor({}, 'textMuted');

  useEffect(() => {
    let isMounted = true;
    fetchShopDetail(shopId)
      .then((result) => {
        if (!isMounted) return;
        setShop(result.shop);
        setServices(result.services);
        setBarbers(result.barbers);
      })
      .catch((e) => isMounted && setLoadError(e instanceof Error ? e.message : 'Could not load this shop.'))
      .finally(() => isMounted && setLoading(false));
    return () => {
      isMounted = false;
    };
  }, [shopId]);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDurationMin = selectedServices.reduce((sum, s) => sum + s.duration_min, 0);
  const barber = barbers.find((b) => b.id === barberId);

  const days = useMemo(() => buildDayOptions(), []);

  // Re-fetched per selected day (not once for the whole week) — keeps each
  // read small and means picking a different date always reflects whatever
  // just got booked, without a stale cross-day cache to invalidate.
  useEffect(() => {
    if (!barberId) return;
    let isMounted = true;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    fetchBarberBusyWindows(barberId, dayStart, dayEnd)
      .then((windows) => isMounted && setBusyWindows(windows))
      .catch(() => isMounted && setBusyWindows([])); // non-fatal — worst case, slots just don't grey out
    return () => {
      isMounted = false;
    };
  }, [barberId, selectedDate]);

  const slots = useMemo(
    () =>
      shop
        ? buildTimeSlots(selectedDate, shop.opening_hours, totalDurationMin, BOOKING_BUFFER_MINUTES, busyWindows)
        : [],
    [shop, selectedDate, totalDurationMin, busyWindows]
  );

  async function handleConfirm() {
    if (!selectedSlot || !barber) return;
    tapFeedback();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createBooking({
        shopId,
        barberId,
        serviceIds: selectedServiceIds,
        scheduledAt: selectedSlot.id, // built as an ISO string in buildTimeSlots
      });
      router.replace('/(customer)/bookings');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not create this booking. Please try again.');
      setSelectedSlot(null); // the slot that just failed shouldn't stay "selected"
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={tint} />
      </Screen>
    );
  }

  if (loadError || !shop || !barber || selectedServices.length === 0) {
    return (
      <Screen style={styles.center}>
        <ThemedText style={{ color: danger, textAlign: 'center', paddingHorizontal: Spacing.xl }}>
          {loadError ?? 'This booking request is missing required details. Go back and try again.'}
        </ThemedText>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            tapFeedback();
            if (router.canGoBack()) router.back();
            else router.replace(`/(customer)/shop/${shopId}`);
          }}
          style={[styles.backBtn, { backgroundColor: surface, borderColor: surfaceBorder }]}
          hitSlop={12}>
          <Ionicons name="arrow-back" size={18} color={icon} />
        </Pressable>
        <ThemedText type="title" style={styles.screenTitle}>
          Choose a Time
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.summaryCard}>
          <ThemedText style={styles.shopName}>{shop.name}</ThemedText>
          <View style={styles.summaryRow}>
            <Ionicons name="person-outline" size={14} color={icon} />
            <ThemedText style={[styles.summaryText, { color: textMuted }]}>{barber.name}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="cut-outline" size={14} color={icon} />
            <ThemedText style={[styles.summaryText, { color: textMuted }]} numberOfLines={1}>
              {selectedServices.map((s) => s.name).join(', ')} · {totalDurationMin} min
            </ThemedText>
          </View>
          <ThemedText style={[styles.totalText, { color: tint }]}>{formatRupees(totalPrice)}</ThemedText>
        </Card>

        {submitError ? (
          <View style={[styles.errorBanner, { borderColor: danger }]}>
            <Ionicons name="alert-circle-outline" size={16} color={danger} />
            <ThemedText style={{ color: danger, flex: 1 }}>{submitError}</ThemedText>
          </View>
        ) : null}

        <SlotPicker
          days={days}
          slots={slots}
          selectedDate={selectedDate}
          selectedSlotId={selectedSlot?.id}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setSelectedSlot(null);
          }}
          onSelectSlot={setSelectedSlot}
        />

        {slots.length === 0 ? (
          <View style={styles.noSlotsState}>
            <Ionicons name="calendar-clear-outline" size={28} color={textMuted} />
            <ThemedText style={{ color: textMuted }}>
              {shop.name} isn&apos;t open long enough that day for this booking — try another date.
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: surface, borderTopColor: surfaceBorder }]}>
        <Button
          title={selectedSlot ? `Confirm ${selectedSlot.timeLabel}` : 'Select a time slot'}
          onPress={handleConfirm}
          loading={submitting}
          disabled={!selectedSlot}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 20, fontWeight: '800' },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2, gap: Spacing.md },
  summaryCard: { gap: 4 },
  shopName: { fontSize: 17, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontSize: 13, fontWeight: '500' },
  totalText: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  noSlotsState: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg, paddingHorizontal: Spacing.lg },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
