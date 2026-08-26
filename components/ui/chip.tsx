import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

interface ChipProps {
  label: string;
  active?: boolean;
  /** Ionicons glyph name, e.g. "cut-outline" — rendered as a real icon, not text. */
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one selectable-pill component every screen should use instead of a
 * hand-rolled `Pressable` + `styles.categoryPill`/`barberChip`/`devChip` —
 * three near-identical copies of this drifted apart before this got pulled
 * out. Reads active/inactive colors from the theme (light + dark), so it
 * doesn't go on to repeat the light-mode-only-hardcoded-hex mistake either.
 */
export function Chip({ label, active = false, icon, onPress, disabled = false, style }: ChipProps) {
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const surface = useThemeColor({}, 'surface');
  const surfaceBorder = useThemeColor({}, 'surfaceBorder');
  const iconColor = useThemeColor({}, 'icon');
  const text = useThemeColor({}, 'text');

  const fg = active ? onTint : text;

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? tint : surface,
          borderColor: active ? tint : surfaceBorder,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {icon ? (
        <Ionicons name={icon} size={14} color={active ? onTint : iconColor} style={styles.icon} />
      ) : null}
      <ThemedText style={[styles.text, { color: fg }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  icon: {
    marginRight: -2,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
