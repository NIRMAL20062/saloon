import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BookingListItem, BookingStatus } from '@/features/bookings/api';
import { useThemeColor } from '@/hooks/use-theme-color';

const STATUS_LABEL: Record<BookingStatus, string> = {
  draft: 'Draft',
  awaiting_shop: 'Awaiting shop response',
  payment_pending: 'Payment pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  expired: 'Expired',
};

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  draft: 'neutral',
  awaiting_shop: 'warning',
  payment_pending: 'warning',
  confirmed: 'success',
  rejected: 'danger',
  expired: 'neutral',
};

function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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
  /** Customer view shows the shop and a Pay Now button when awaiting payment; partner view shows the customer and Accept/Reject controls. */
  variant: 'customer' | 'partner';
  onAccept?: () => void;
  onReject?: () => void;
  onPayNow?: () => void;
  accepting?: boolean;
  rejecting?: boolean;
}

export function BookingCard({
  booking,
  variant,
  onAccept,
  onReject,
  onPayNow,
  accepting,
  rejecting,
}: BookingCardProps) {
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textMuted = useThemeColor({}, 'textMuted');
  const icon = useThemeColor({}, 'icon');
  const danger = useThemeColor({}, 'danger');
  const warning = useThemeColor({}, 'warning');

  const isAwaitingShop = booking.status === 'awaiting_shop';
  const isAwaitingPayment = booking.status === 'payment_pending';
  const isCountingDown = isAwaitingShop || isAwaitingPayment;

  // Which timestamp the countdown/progress bar tracks depends on which wait
  // this booking is actually in — the shop's response window and the
  // payment window are separate deadlines with separate expiry columns.
  const expiresAt = isAwaitingShop
    ? booking.shop_response_expires_at
    : isAwaitingPayment
      ? booking.payment_expires_at
      : null;
  const secondsLeft = useCountdown(expiresAt, isCountingDown);
  const isUrgent = isCountingDown && secondsLeft <= 30;
  // The full window's length, not a hardcoded constant — derived from the
  // booking's own timestamps so the progress bar's fill is correct even if
  // the tuning numbers behind SHOP_RESPONSE_SECONDS/PAYMENT_WINDOW_MINUTES
  // change. `awaiting_shop`'s window starts at `created_at`; `payment_pending`'s
  // starts when the shop accepted, which `booking_events` records but this
  // list view doesn't fetch — falling back to `created_at` there still gives
  // a reasonable (if slightly generous) fill rather than nothing.
  const windowStart = new Date(booking.created_at).getTime();
  const totalWindowSeconds =
    expiresAt != null ? Math.max(1, Math.round((new Date(expiresAt).getTime() - windowStart) / 1000)) : 1;

  const serviceNames = booking.booking_services.map((s) => s.services?.name).filter(Boolean).join(', ');

  const title = variant === 'customer' ? booking.shops?.name ?? 'Shop' : booking.profiles?.full_name ?? 'Customer';
  const subtitle = variant === 'customer' ? booking.shops?.address : null;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={[styles.subtitle, { color: textMuted }]} numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <Badge label={STATUS_LABEL[booking.status]} tone={STATUS_TONE[booking.status]} dot={isCountingDown} />
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={14} color={icon} />
        <ThemedText style={[styles.metaText, { color: textMuted }]}>{formatScheduledAt(booking.scheduled_at)}</ThemedText>
      </View>

      {booking.barbers?.name ? (
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color={icon} />
          <ThemedText style={[styles.metaText, { color: textMuted }]}>{booking.barbers.name}</ThemedText>
        </View>
      ) : null}

      {serviceNames ? (
        <View style={styles.metaRow}>
          <Ionicons name="cut-outline" size={14} color={icon} />
          <ThemedText style={[styles.metaText, { color: textMuted }]} numberOfLines={1}>
            {serviceNames}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <ThemedText style={styles.amount}>{formatRupees(booking.total_amount)}</ThemedText>

        {isCountingDown ? (
          <View style={styles.countdownRow}>
            <Ionicons name="time-outline" size={14} color={isUrgent ? danger : warning} />
            <ThemedText style={[styles.countdownText, { color: isUrgent ? danger : warning }]}>
              {secondsLeft > 0
                ? `${secondsLeft}s ${isAwaitingShop ? 'to respond' : 'to pay'}`
                : 'expiring…'}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {isCountingDown ? (
        <View style={[styles.progressTrack, { backgroundColor: surfaceBorder }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${totalWindowSeconds > 0 ? (secondsLeft / totalWindowSeconds) * 100 : 0}%`, backgroundColor: isUrgent ? danger : warning },
            ]}
          />
        </View>
      ) : null}

      {variant === 'partner' && isAwaitingShop ? (
        <View style={styles.actionsRow}>
          <Button title="Reject" variant="danger" onPress={onReject} loading={rejecting} disabled={accepting} style={styles.actionButton} />
          <Button title="Accept" onPress={onAccept} loading={accepting} disabled={rejecting} style={styles.actionButton} />
        </View>
      ) : null}

      {variant === 'customer' && isAwaitingPayment ? (
        <Button title="Pay Now" onPress={onPayNow} style={styles.actionsRow} />
      ) : null}

      {variant === 'customer' && booking.payment_status === 'failed' && isAwaitingPayment ? (
        <ThemedText style={[styles.retryHint, { color: danger }]}>
          Last attempt failed — you can try again before the window closes.
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  titleCol: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 12, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '500' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  amount: { fontSize: 16, fontWeight: '800' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countdownText: { fontSize: 12, fontWeight: '700' },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionButton: { flex: 1 },
  retryHint: { fontSize: 12, fontWeight: '600' },
});
