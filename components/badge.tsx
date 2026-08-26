import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * A status pill — the concrete implementation of docs/DESIGN.md's "status is
 * always visible, never inferred" principle. Every place a booking/shop/
 * service state is shown (open/closed, pending/approved, active/inactive,
 * and every booking status from Phase 4 on) should render through this
 * instead of ad hoc colored `ThemedText`, so status always looks like status.
 */
export function Badge({
  label,
  tone = 'neutral',
  dot = false,
}: {
  label: string;
  tone?: BadgeTone;
  /** Show a small pulse-style dot before the label — for "live" states like open/closed. */
  dot?: boolean;
}) {
  const success = useThemeColor({}, 'success');
  const successSurface = useThemeColor({}, 'successSurface');
  const warning = useThemeColor({}, 'warning');
  const warningSurface = useThemeColor({}, 'warningSurface');
  const danger = useThemeColor({}, 'danger');
  const dangerSurface = useThemeColor({}, 'dangerSurface');
  const icon = useThemeColor({}, 'icon');
  const surface = useThemeColor({}, 'surface');

  const [color, background] =
    tone === 'success'
      ? [success, successSurface]
      : tone === 'warning'
        ? [warning, warningSurface]
        : tone === 'danger'
          ? [danger, dangerSurface]
          : [icon, surface];

  return (
    <View style={[styles.base, { backgroundColor: background }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <ThemedText style={[styles.text, { color }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 13, fontWeight: '600' },
});
