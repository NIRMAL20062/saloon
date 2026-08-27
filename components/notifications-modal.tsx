import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'booking' | 'promo' | 'system';
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Booking Confirmed!',
    message: 'The Grooming Station has confirmed your haircut slot for 5:00 PM today.',
    time: '10m ago',
    unread: true,
    type: 'booking',
  },
  {
    id: '2',
    title: 'GLIDE PASS Unlocked 🎁',
    message: 'Enjoy 15% OFF your next 3 salon visits.',
    time: '2h ago',
    unread: true,
    type: 'promo',
  },
  {
    id: '3',
    title: 'Barber Alex is ready',
    message: 'Alex is assigned as your dedicated stylist for your upcoming visit.',
    time: 'Yesterday',
    unread: false,
    type: 'booking',
  },
];

export interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textPrimary = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: surface, borderColor: surfaceBorder }]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Notifications</ThemedText>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color={textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {MOCK_NOTIFICATIONS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => tapFeedback()}
                style={({ pressed }) => [
                  styles.notificationRow,
                  { borderColor: surfaceBorder },
                  item.unread && { backgroundColor: 'rgba(81, 42, 69, 0.05)' },
                  pressed && styles.pressed,
                ]}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        item.type === 'booking'
                          ? Colors.light.successSurface
                          : item.type === 'promo'
                            ? 'rgba(240, 111, 97, 0.15)'
                            : surfaceBorder,
                    },
                  ]}>
                  <Ionicons
                    name={
                      item.type === 'booking'
                        ? 'calendar'
                        : item.type === 'promo'
                          ? 'gift'
                          : 'notifications'
                    }
                    size={18}
                    color={
                      item.type === 'booking'
                        ? Colors.light.success
                        : item.type === 'promo'
                          ? Colors.light.coral
                          : tint
                    }
                  />
                </View>

                <View style={styles.textCol}>
                  <View style={styles.titleRow}>
                    <ThemedText style={[styles.notifTitle, { color: textPrimary }]}>
                      {item.title}
                    </ThemedText>
                    <ThemedText style={[styles.timeText, { color: textMuted }]}>{item.time}</ThemedText>
                  </View>
                  <ThemedText style={[styles.messageText, { color: textMuted }]} numberOfLines={2}>
                    {item.message}
                  </ThemedText>
                </View>

                {item.unread ? <View style={[styles.unreadDot, { backgroundColor: Colors.light.coral }]} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.sectionHeader,
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    ...Typography.cardTitle,
    fontSize: 14,
    fontWeight: '700',
  },
  timeText: {
    ...Typography.microText,
    fontSize: 10,
  },
  messageText: {
    ...Typography.bodyText,
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
