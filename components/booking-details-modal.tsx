import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { BookingListItem, BookingStatus } from '@/features/bookings/api';
import { tapFeedback } from '@/lib/haptics';

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  draft: { label: 'Draft', color: '#64748B', bg: '#F1F5F9', icon: 'document-text-outline' },
  awaiting_shop: { label: 'Awaiting Shop', color: '#D97706', bg: '#FFFBEB', icon: 'time-outline' },
  payment_pending: { label: 'Payment Pending', color: '#D97706', bg: '#FFFBEB', icon: 'card-outline' },
  confirmed: { label: 'Confirmed', color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle-outline' },
  expired: { label: 'Expired', color: '#EA580C', bg: '#FFF7ED', icon: 'alert-circle-outline' },
};

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

export function BookingDetailsModal({
  booking,
  visible,
  onClose,
  onPayNow,
}: {
  booking: BookingListItem | null;
  visible: boolean;
  onClose: () => void;
  onPayNow?: (bookingId: string) => void;
}) {
  if (!booking) return null;

  const statusInfo = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.draft;
  const isPayable = booking.status === 'payment_pending';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.sheetTitle}>Appointment Details</ThemedText>
              <ThemedText style={styles.bookingIdText}>ID: {booking.id.slice(0, 8).toUpperCase()}</ThemedText>
            </View>
            <Pressable
              onPress={() => {
                tapFeedback();
                onClose();
              }}
              style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status Banner */}
            <View style={[styles.statusBanner, { backgroundColor: statusInfo.bg }]}>
              <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
              <View style={styles.statusTextCol}>
                <ThemedText style={[styles.statusBannerLabel, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </ThemedText>
                <ThemedText style={styles.statusBannerDesc}>
                  {booking.status === 'confirmed'
                    ? 'Your booking is confirmed with the salon.'
                    : booking.status === 'payment_pending'
                      ? 'Shop has accepted. Please complete payment.'
                      : booking.status === 'awaiting_shop'
                        ? 'Waiting for the shop to accept your request.'
                        : booking.status === 'expired'
                          ? 'This booking request has expired.'
                          : 'This booking was rejected.'}
                </ThemedText>
              </View>
            </View>

            {/* Date & Time Box */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="calendar-outline" size={18} color="#512A45" />
                </View>
                <View style={styles.infoCol}>
                  <ThemedText style={styles.infoLabel}>DATE & TIME</ThemedText>
                  <ThemedText style={styles.infoValue}>{formatFullDate(booking.scheduled_at)}</ThemedText>
                  <ThemedText style={styles.infoSubValue}>at {formatTime(booking.scheduled_at)}</ThemedText>
                </View>
              </View>
            </View>

            {/* Shop & Barber Details */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="storefront-outline" size={18} color="#512A45" />
                </View>
                <View style={styles.infoCol}>
                  <ThemedText style={styles.infoLabel}>SALON / SHOP</ThemedText>
                  <ThemedText style={styles.infoValue}>{booking.shops?.name ?? 'Salon'}</ThemedText>
                  {booking.shops?.address ? (
                    <ThemedText style={styles.infoSubValue}>{booking.shops.address}</ThemedText>
                  ) : null}
                </View>
              </View>

              {booking.barbers?.name ? (
                <View style={[styles.infoRow, styles.topDivider]}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="person-outline" size={18} color="#512A45" />
                  </View>
                  <View style={styles.infoCol}>
                    <ThemedText style={styles.infoLabel}>BARBER / STYLIST</ThemedText>
                    <ThemedText style={styles.infoValue}>{booking.barbers.name}</ThemedText>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Services List & Price Breakdown */}
            <View style={styles.infoCard}>
              <ThemedText style={styles.infoLabel}>SELECTED SERVICES</ThemedText>
              <View style={styles.servicesList}>
                {booking.booking_services.map((item, index) => (
                  <View key={item.service_id ?? index} style={styles.serviceLineItem}>
                    <ThemedText style={styles.serviceItemName}>
                      {item.services?.name ?? 'Service'}
                    </ThemedText>
                    <ThemedText style={styles.serviceItemPrice}>
                      {formatRupees(item.price)}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Total Amount</ThemedText>
                <ThemedText style={styles.totalValue}>
                  {formatRupees(booking.total_amount)}
                </ThemedText>
              </View>
            </View>

            {/* Actions */}
            {isPayable && onPayNow ? (
              <Pressable
                onPress={() => {
                  tapFeedback();
                  onClose();
                  onPayNow(booking.id);
                }}
                style={styles.payNowBtn}>
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.payNowBtnText}>Pay Now ({formatRupees(booking.total_amount)})</ThemedText>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                tapFeedback();
                onClose();
              }}
              style={styles.closeActionBtn}>
              <ThemedText style={styles.closeActionText}>Close</ThemedText>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  bookingIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  statusTextCol: {
    flex: 1,
  },
  statusBannerLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusBannerDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topDivider: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3EBF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  infoSubValue: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 1,
  },
  servicesList: {
    gap: 6,
    marginTop: 4,
  },
  serviceLineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceItemName: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '500',
  },
  serviceItemPrice: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D7A53',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#512A45',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 6,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  closeActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
  },
  closeActionText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});
