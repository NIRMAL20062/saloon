import React, { useState } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';
import { ThemedText } from '@/components/themed-text';

export interface TimeSlot {
  id: string;
  timeLabel: string; // e.g. "10:00 AM"
  period: 'morning' | 'afternoon' | 'evening';
  isAvailable: boolean;
  isLowSlots?: boolean;
}

export interface DayOption {
  dateString: string; // e.g. "2026-08-26"
  dayName: string; // e.g. "TODAY"
  dateLabel: string; // e.g. "Aug 26"
}

export interface SlotPickerProps {
  days?: DayOption[];
  slots?: TimeSlot[];
  selectedDate?: string;
  selectedSlotId?: string;
  onSelectDate?: (dateString: string) => void;
  onSelectSlot?: (slot: TimeSlot) => void;
}

const DEFAULT_DAYS: DayOption[] = [
  { dateString: '2026-08-26', dayName: 'TODAY', dateLabel: 'Aug 26' },
  { dateString: '2026-08-27', dayName: 'TOMORROW', dateLabel: 'Aug 27' },
  { dateString: '2026-08-28', dayName: 'THU', dateLabel: 'Aug 28' },
  { dateString: '2026-08-29', dayName: 'FRI', dateLabel: 'Aug 29' },
  { dateString: '2026-08-30', dayName: 'SAT', dateLabel: 'Aug 30' },
];

const DEFAULT_SLOTS: TimeSlot[] = [
  { id: '1', timeLabel: '09:00 AM', period: 'morning', isAvailable: true },
  { id: '2', timeLabel: '10:00 AM', period: 'morning', isAvailable: true, isLowSlots: true },
  { id: '3', timeLabel: '11:30 AM', period: 'morning', isAvailable: false },
  { id: '4', timeLabel: '01:00 PM', period: 'afternoon', isAvailable: true },
  { id: '5', timeLabel: '02:30 PM', period: 'afternoon', isAvailable: true },
  { id: '6', timeLabel: '04:00 PM', period: 'afternoon', isAvailable: true },
  { id: '7', timeLabel: '05:30 PM', period: 'evening', isAvailable: true },
  { id: '8', timeLabel: '07:00 PM', period: 'evening', isAvailable: true },
];

export function SlotPicker({
  days = DEFAULT_DAYS,
  slots = DEFAULT_SLOTS,
  selectedDate: propSelectedDate,
  selectedSlotId: propSelectedSlotId,
  onSelectDate,
  onSelectSlot,
}: SlotPickerProps) {
  const [internalDate, setInternalDate] = useState(days[0]?.dateString || '');
  const [internalSlotId, setInternalSlotId] = useState('');

  const activeDate = propSelectedDate !== undefined ? propSelectedDate : internalDate;
  const activeSlotId = propSelectedSlotId !== undefined ? propSelectedSlotId : internalSlotId;

  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const tintSurface = useThemeColor({}, 'tintSurface');
  const warning = useThemeColor({}, 'warning');
  const warningSurface = useThemeColor({}, 'warningSurface');

  const onTint = useThemeColor({}, 'onTint');

  const handleDatePress = (dateStr: string) => {
    tapFeedback();
    if (onSelectDate) onSelectDate(dateStr);
    else setInternalDate(dateStr);
  };

  const handleSlotPress = (slot: TimeSlot) => {
    if (!slot.isAvailable) return;
    tapFeedback();
    if (onSelectSlot) onSelectSlot(slot);
    else setInternalSlotId(slot.id);
  };

  const renderPeriodGroup = (periodTitle: string, periodKey: 'morning' | 'afternoon' | 'evening', iconName: string) => {
    const periodSlots = slots.filter((s) => s.period === periodKey);
    if (periodSlots.length === 0) return null;

    return (
      <View key={periodKey} style={styles.periodGroup}>
        <View style={styles.periodHeader}>
          <Ionicons name={iconName as any} size={15} color={textMuted} />
          <ThemedText style={[styles.periodTitle, { color: textMuted }]}>{periodTitle}</ThemedText>
        </View>

        <View style={styles.slotsGrid}>
          {periodSlots.map((slot) => {
            const isSelected = slot.id === activeSlotId;
            const isDisabled = !slot.isAvailable;

            return (
              <Pressable
                key={slot.id}
                disabled={isDisabled}
                onPress={() => handleSlotPress(slot)}
                style={({ pressed }) => [
                  styles.slotChip,
                  { backgroundColor: surface, borderColor: surfaceBorder },
                  isSelected && { backgroundColor: tint, borderColor: tint },
                  isDisabled && styles.disabledChip,
                  pressed && !isDisabled && styles.pressed,
                ]}>
                <ThemedText
                  style={[
                    styles.slotTimeText,
                    isSelected && { color: onTint },
                    isDisabled && { color: textMuted },
                  ]}>
                  {slot.timeLabel}
                </ThemedText>

                {isDisabled && (
                  <View style={[styles.lowBadge, { backgroundColor: surfaceBorder }]}>
                    <ThemedText style={[styles.lowText, { color: textMuted }]}>Booked</ThemedText>
                  </View>
                )}

                {!isDisabled && slot.isLowSlots && !isSelected && (
                  <View style={[styles.lowBadge, { backgroundColor: warningSurface }]}>
                    <ThemedText style={[styles.lowText, { color: warning }]}>1 left</ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Horizontal Date Selector */}
      <ThemedText style={styles.sectionHeader}>Select Date</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysScroll}>
        {days.map((day) => {
          const isSelected = day.dateString === activeDate;

          return (
            <Pressable
              key={day.dateString}
              onPress={() => handleDatePress(day.dateString)}
              style={({ pressed }) => [
                styles.dayChip,
                { backgroundColor: surface, borderColor: surfaceBorder },
                isSelected && { backgroundColor: tint, borderColor: tint },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.dayName, isSelected && { color: onTint }]}>
                {day.dayName}
              </ThemedText>
              <ThemedText style={[styles.dateLabel, isSelected && { color: onTint }]}>
                {day.dateLabel}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Time Slot Picker */}
      <ThemedText style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>Select Time Slot</ThemedText>
      {renderPeriodGroup('MORNING SLOTS', 'morning', 'sunny-outline')}
      {renderPeriodGroup('AFTERNOON SLOTS', 'afternoon', 'partly-sunny-outline')}
      {renderPeriodGroup('EVENING SLOTS', 'evening', 'moon-outline')}
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  sectionHeader: {
    ...Typography.sectionHeader,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  daysScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  dayChip: {
    width: 80,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...Shadow.sm,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  dayName: {
    ...Typography.microText,
    fontWeight: '700',
    fontSize: 10,
  },
  dateLabel: {
    ...Typography.badgeText,
    fontWeight: '800',
    fontSize: 13,
  },
  selectedText: {
    color: '#FFF',
  },
  periodGroup: {
    marginBottom: Spacing.lg,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  periodTitle: {
    ...Typography.microText,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    minWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadow.sm,
  },
  slotTimeText: {
    ...Typography.badgeText,
    fontWeight: '700',
  },
  disabledChip: {
    opacity: 0.4,
    backgroundColor: 'transparent',
  },
  lowBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  lowText: {
    ...Typography.microText,
    fontSize: 8,
    fontWeight: '800',
  },
});
