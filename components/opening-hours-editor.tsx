import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  DAY_KEYS,
  type DayKey,
  type OpeningHours,
  type OpeningHoursFieldErrors,
} from '@/features/shops/partner-api';
import { successFeedback } from '@/lib/haptics';

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const EMERALD_PRIMARY = '#0D7A53';
const TEXT_DARK = '#111827';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';
const ROW_DIVIDER = '#F1F5F9';
const DANGER_COLOR = '#EF4444';

export function OpeningHoursEditor({
  value,
  onChange,
  errors = {},
  disabled = false,
}: {
  value: OpeningHours;
  onChange: (next: OpeningHours) => void;
  errors?: OpeningHoursFieldErrors;
  disabled?: boolean;
}) {
  function patchDay(day: DayKey, patch: Partial<OpeningHours[DayKey]>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  return (
    <View style={styles.container}>
      {DAY_KEYS.map((day, i) => {
        const hours = value[day];
        const error = errors[day];
        const isOpen = !hours.closed;

        return (
          <View
            key={day}
            style={[
              styles.dayCard,
              i > 0 && { borderTopWidth: 1, borderTopColor: ROW_DIVIDER },
            ]}>
            {/* Top row: Day Name & Toggle */}
            <View style={styles.dayHeaderRow}>
              <ThemedText style={styles.dayName}>{DAY_LABELS[day]}</ThemedText>
              <Switch
                value={isOpen}
                disabled={disabled}
                onValueChange={(open) => {
                  successFeedback();
                  patchDay(day, { closed: !open });
                }}
                trackColor={{ false: '#E2E8F0', true: EMERALD_PRIMARY }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Bottom row: Subtitle & Time selectors or Closed text */}
            {isOpen ? (
              <View style={styles.timeDetailsRow}>
                <View style={styles.regularHoursBadge}>
                  <Ionicons name="calendar-outline" size={13} color={TEXT_MUTED} />
                  <ThemedText style={styles.regularHoursText}>Regular hours</ThemedText>
                </View>

                <View style={styles.timePickersRow}>
                  {/* Start time pill */}
                  <View style={[styles.timePill, error && styles.timePillError]}>
                    <Ionicons name="time-outline" size={13} color={TEXT_MUTED} />
                    <TextInput
                      value={hours.open}
                      onChangeText={(open) => patchDay(day, { open })}
                      placeholder="09:00"
                      placeholderTextColor="#94A3B8"
                      editable={!disabled}
                      maxLength={5}
                      style={styles.timeInput}
                    />
                    <Ionicons name="chevron-down" size={13} color={TEXT_MUTED} />
                  </View>

                  <ThemedText style={styles.toText}>to</ThemedText>

                  {/* End time pill */}
                  <View style={[styles.timePill, error && styles.timePillError]}>
                    <Ionicons name="time-outline" size={13} color={TEXT_MUTED} />
                    <TextInput
                      value={hours.close}
                      onChangeText={(close) => patchDay(day, { close })}
                      placeholder="20:00"
                      placeholderTextColor="#94A3B8"
                      editable={!disabled}
                      maxLength={5}
                      style={styles.timeInput}
                    />
                    <Ionicons name="chevron-down" size={13} color={TEXT_MUTED} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.closedRow}>
                <ThemedText style={styles.closedText}>Closed all day</ThemedText>
              </View>
            )}

            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
    marginTop: Spacing.sm,
  },
  dayCard: {
    paddingVertical: 14,
    gap: 10,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  timeDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  regularHoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  regularHoursText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  timePickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  timePillError: {
    borderColor: DANGER_COLOR,
  },
  timeInput: {
    fontSize: 13.5,
    fontWeight: '600',
    color: TEXT_DARK,
    width: 44,
    textAlign: 'center',
    padding: 0,
  },
  toText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  closedRow: {
    paddingVertical: 2,
  },
  closedText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: DANGER_COLOR,
    marginTop: 2,
  },
});
