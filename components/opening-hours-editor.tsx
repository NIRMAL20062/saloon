import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { Spacing } from '@/constants/theme';
import {
  DAY_KEYS,
  type DayKey,
  type OpeningHours,
  type OpeningHoursFieldErrors,
} from '@/features/shops/partner-api';
import { useThemeColor } from '@/hooks/use-theme-color';
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

/**
 * Per-day open/close time editor for `shops.opening_hours` (CLAUDE.md Phase 3:
 * "working hours — a simple per-day open/close time"). Deliberately plain
 * HH:MM text fields rather than a native time-picker component — this
 * project's dependency list doesn't include one yet, and pulling in a new
 * native module for a "simple" field isn't worth it (Section 7: keep the
 * 8 GB dev machine light, prefer what's already there).
 */
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
  const danger = useThemeColor({}, 'danger');
  const textMuted = useThemeColor({}, 'textMuted');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const success = useThemeColor({}, 'success');

  function patchDay(day: DayKey, patch: Partial<OpeningHours[DayKey]>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  return (
    <View style={styles.container}>
      {DAY_KEYS.map((day, i) => {
        const hours = value[day];
        const error = errors[day];
        return (
          <View
            key={day}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: surfaceBorder }]}>
            <View style={styles.dayRow}>
              <ThemedText style={styles.dayLabel}>{DAY_LABELS[day]}</ThemedText>
              <Switch
                value={!hours.closed}
                disabled={disabled}
                onValueChange={(open) => {
                  successFeedback();
                  patchDay(day, { closed: !open });
                }}
                trackColor={{ false: surfaceBorder, true: success }}
              />
            </View>

            {hours.closed ? (
              <ThemedText style={[styles.closedText, { color: textMuted }]}>Closed</ThemedText>
            ) : (
              <View style={styles.timeRow}>
                <ThemedTextInput
                  value={hours.open}
                  onChangeText={(open) => patchDay(day, { open })}
                  placeholder="09:00"
                  editable={!disabled}
                  error={!!error}
                  style={styles.timeInput}
                />
                <ThemedText style={{ color: textMuted }}>to</ThemedText>
                <ThemedTextInput
                  value={hours.close}
                  onChangeText={(close) => patchDay(day, { close })}
                  placeholder="20:00"
                  editable={!disabled}
                  error={!!error}
                  style={styles.timeInput}
                />
              </View>
            )}
            {error ? <ThemedText style={[styles.errorText, { color: danger }]}>{error}</ThemedText> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  row: { paddingVertical: Spacing.sm, gap: Spacing.xs },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontSize: 14, fontWeight: '700' },
  closedText: { fontSize: 13, fontStyle: 'italic' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  // `minWidth: 0` matters here: a flex:1 child otherwise refuses to shrink
  // below its content's natural size, which pushed the second field off the
  // edge of narrower screens instead of sharing the row evenly.
  timeInput: { flex: 1, minWidth: 0, paddingVertical: Spacing.sm, fontSize: 14, textAlign: 'center' },
  errorText: { fontSize: 11, fontWeight: '600' },
});
