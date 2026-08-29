import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import type { BookingListItem, BookingStatus } from '@/features/bookings/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; stripe: string; iconBg: string }
> = {
  draft: { label: 'Draft', color: '#64748B', bg: '#F1F5F9', stripe: '#94A3B8', iconBg: '#F1F5F9' },
  awaiting_shop: {
    label: 'Awaiting Shop',
    color: '#D97706',
    bg: '#FFFBEB',
    stripe: '#F59E0B',
    iconBg: '#FFFBEB',
  },
  payment_pending: {
    label: 'Payment Pending',
    color: '#D97706',
    bg: '#FFFBEB',
    stripe: '#F59E0B',
    iconBg: '#FFFBEB',
  },
  confirmed: {
    label: 'Confirmed',
    color: '#059669',
    bg: '#ECFDF5',
    stripe: '#10B981',
    iconBg: '#ECFDF5',
  },
  rejected: {
    label: 'Rejected',
    color: '#DC2626',
    bg: '#FEF2F2',
    stripe: '#EF4444',
    iconBg: '#FEF2F2',
  },
  expired: {
    label: 'Expired',
    color: '#EA580C',
    bg: '#FFF7ED',
    stripe: '#F97316',
    iconBg: '#FFF7ED',
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

/** Ticks once a second while `active`, returning seconds remaining until `expiresAt` (never negative). */
function useCountdown(expiresAt: string | null, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  if (!active || !expiresAt) return 0;
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - now) / 1000));
}

export interface BookingCardProps {
  booking: BookingListItem;
  variant: 'customer' | 'partner';
  onAccept?: () => void;
  onReject?: () => void;
  onPayNow?: () => void;
  onViewDetails?: () => void;
  accepting?: boolean;
  rejecting?: boolean;
}

export function BookingCard({
  booking,
  variant,
  onAccept,
  onReject,
  onPayNow,
  onViewDetails,
  accepting,
  rejecting,
}: BookingCardProps) {
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const danger = useThemeColor({}, 'danger');
  const warning = useThemeColor({}, 'warning');

  const isAwaitingShop = booking.status === 'awaiting_shop';
  const isAwaitingPayment = booking.status === 'payment_pending';
  const isCountingDown = isAwaitingShop || isAwaitingPayment;

  const expiresAt = isAwaitingShop
    ? booking.shop_response_expires_at
    : isAwaitingPayment
      ? booking.payment_expires_at
      : null;
  const secondsLeft = useCountdown(expiresAt, isCountingDown);
  const isUrgent = isCountingDown && secondsLeft <= 30;

  const windowStart = new Date(booking.created_at).getTime();
  const totalWindowSeconds =
    expiresAt != null ? Math.max(1, Math.round((new Date(expiresAt).getTime() - windowStart) / 1000)) : 1;

  const serviceNames = booking.booking_services.map((s) => s.services?.name).filter(Boolean).join(', ');
  const title = variant === 'customer' ? booking.shops?.name ?? 'Salon' : booking.profiles?.full_name ?? 'Customer';
  const subtitle = variant === 'customer' ? booking.shops?.address : null;

  const statusConfig = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.draft;

  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onViewDetails?.();
      }}
      style={({ pressed }) => [styles.cardContainer, pressed && styles.pressed]}>
      {/* Left Vertical Status Accent Stripe */}
      <View style={[styles.leftAccentStripe, { backgroundColor: statusConfig.stripe }]} />

      <View style={styles.cardInner}>
        {/* Top Info Layout */}
        <View style={styles.topSection}>
          {/* Left Date / Time Block */}
          <View style={styles.dateBlock}>
            <View style={[styles.calendarSquircle, { backgroundColor: statusConfig.iconBg }]}>
              <Ionicons name="calendar-outline" size={18} color={statusConfig.color} />
            </View>
            <View style={styles.dateTextGroup}>
              <ThemedText style={styles.dateFormattedText}>{formatDate(booking.scheduled_at)}</ThemedText>
              <ThemedText style={styles.timeFormattedText}>{formatTime(booking.scheduled_at)}</ThemedText>
            </View>
          </View>

          {/* Middle & Right Shop, Metadata, and Status Block */}
          <View style={styles.mainInfoBlock}>
            <View style={styles.titleAndStatusRow}>
              <ThemedText style={styles.shopTitle} numberOfLines={1}>
                {title}
              </ThemedText>

              <View style={styles.statusPillGroup}>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                  <ThemedText style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </ThemedText>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={(e) => {
                    e.stopPropagation();
                    tapFeedback();
                    onViewDetails?.();
                  }}>
                  <Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" />
                </Pressable>
              </View>
            </View>

            {subtitle ? (
              <ThemedText style={styles.addressSubtitle} numberOfLines={1}>
                {subtitle}
              </ThemedText>
            ) : null}

            {/* Barber & Service meta line */}
            <View style={styles.metaLine}>
              {booking.barbers?.name ? (
                <View style={styles.metaItem}>
                  <Ionicons name="person-outline" size={11} color="#64748B" />
                  <ThemedText style={styles.metaItemText} numberOfLines={1}>
                    {booking.barbers.name}
                  </ThemedText>
                </View>
              ) : null}

              {booking.barbers?.name && serviceNames ? (
                <ThemedText style={styles.metaDivider}>|</ThemedText>
              ) : null}

              {serviceNames ? (
                <View style={styles.metaItem}>
                  <Ionicons name="cut-outline" size={11} color="#64748B" />
                  <ThemedText style={styles.metaItemText} numberOfLines={1}>
                    {serviceNames}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Countdown Timer (if waiting response or payment) */}
        {isCountingDown ? (
          <View style={styles.countdownSection}>
            <View style={styles.countdownRow}>
              <Ionicons name="time-outline" size={13} color={isUrgent ? danger : warning} />
              <ThemedText style={[styles.countdownText, { color: isUrgent ? danger : warning }]}>
                {secondsLeft > 0
                  ? `${secondsLeft}s ${isAwaitingShop ? 'for shop to accept' : 'to complete payment'}`
                  : 'expiring…'}
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: surfaceBorder }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${totalWindowSeconds > 0 ? (secondsLeft / totalWindowSeconds) * 100 : 0}%`,
                    backgroundColor: isUrgent ? danger : warning,
                  },
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* Bottom Footer Row: Price & Actions */}
        <View style={styles.footerRow}>
          <ThemedText style={styles.priceText}>{formatRupees(booking.total_amount)}</ThemedText>

          {variant === 'customer' ? (
            isAwaitingPayment ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  tapFeedback();
                  onPayNow?.();
                }}
                style={styles.payNowActionBtn}>
                <Ionicons name="card-outline" size={14} color="#FFFFFF" />
                <ThemedText style={styles.payNowActionText}>Pay Now</ThemedText>
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  tapFeedback();
                  onViewDetails?.();
                }}
                style={styles.viewDetailsLink}>
                <ThemedText style={[styles.viewDetailsText, { color: statusConfig.color }]}>
                  View Details
                </ThemedText>
                <Ionicons name="chevron-forward" size={14} color={statusConfig.color} />
              </Pressable>
            )
          ) : null}

          {variant === 'partner' && isAwaitingShop ? (
            <View style={styles.partnerActionsRow}>
              <Button
                title="Reject"
                variant="danger"
                onPress={onReject}
                loading={rejecting}
                disabled={accepting}
                style={styles.partnerBtn}
              />
              <Button
                title="Accept"
                onPress={onAccept}
                loading={accepting}
                disabled={rejecting}
                style={styles.partnerBtn}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  leftAccentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
    zIndex: 2,
  },
  cardInner: {
    padding: 14,
    paddingLeft: 16,
    gap: 10,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dateBlock: {
    gap: 4,
    alignItems: 'flex-start',
    minWidth: 72,
  },
  calendarSquircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dateTextGroup: {
    gap: 1,
  },
  dateFormattedText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  timeFormattedText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  mainInfoBlock: {
    flex: 1,
    gap: 3,
  },
  titleAndStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  shopTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  statusPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  addressSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '65%',
  },
  metaItemText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  metaDivider: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  countdownSection: {
    gap: 4,
    paddingTop: 4,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  countdownText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceText: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#111827',
  },
  viewDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewDetailsText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  payNowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#512A45',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  payNowActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  partnerActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  partnerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
