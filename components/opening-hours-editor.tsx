import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PartnerColors, Spacing } from '@/constants/theme';
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
              i > 0 && { borderTopWidth: 1, borderTopColor: PartnerColors.rowDivider },
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
                trackColor={{ false: PartnerColors.cardBorder, true: PartnerColors.primary }}
                thumbColor={PartnerColors.onPrimary}
              />
            </View>

            {/* Bottom row: Subtitle & Time selectors or Closed text */}
            {isOpen ? (
              <View style={styles.timeDetailsRow}>
                <View style={styles.regularHoursBadge}>
                  <Ionicons name="calendar-outline" size={13} color={PartnerColors.textMuted} />
                  <ThemedText style={styles.regularHoursText}>Regular hours</ThemedText>
                </View>

                <View style={styles.timePickersRow}>
                  {/* Start time pill */}
                  <View style={[styles.timePill, error && styles.timePillError]}>
                    <Ionicons name="time-outline" size={13} color={PartnerColors.textMuted} />
                    <TextInput
                      value={hours.open}
                      onChangeText={(open) => patchDay(day, { open })}
                      placeholder="09:00"
                      placeholderTextColor={PartnerColors.placeholder}
                      editable={!disabled}
                      maxLength={5}
                      style={styles.timeInput}
                    />
                    <Ionicons name="chevron-down" size={13} color={PartnerColors.textMuted} />
                  </View>

                  <ThemedText style={styles.toText}>to</ThemedText>

                  {/* End time pill */}
                  <View style={[styles.timePill, error && styles.timePillError]}>
                    <Ionicons name="time-outline" size={13} color={PartnerColors.textMuted} />
                    <TextInput
                      value={hours.close}
                      onChangeText={(close) => patchDay(day, { close })}
                      placeholder="20:00"
                      placeholderTextColor={PartnerColors.placeholder}
                      editable={!disabled}
                      maxLength={5}
                      style={styles.timeInput}
                    />
                    <Ionicons name="chevron-down" size={13} color={PartnerColors.textMuted} />
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
    color: PartnerColors.textPrimary,
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
    color: PartnerColors.textMuted,
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
    backgroundColor: PartnerColors.cardSurface,
    borderWidth: 1,
    borderColor: PartnerColors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  timePillError: {
    borderColor: PartnerColors.danger,
  },
  timeInput: {
    fontSize: 13.5,
    fontWeight: '600',
    color: PartnerColors.textPrimary,
    width: 44,
    textAlign: 'center',
    padding: 0,
  },
  toText: {
    fontSize: 13,
    color: PartnerColors.textMuted,
    fontWeight: '500',
  },
  closedRow: {
    paddingVertical: 2,
  },
  closedText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: PartnerColors.placeholder,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: PartnerColors.danger,
    marginTop: 2,
  },
});
