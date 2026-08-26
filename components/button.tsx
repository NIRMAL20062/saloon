import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { tapFeedback } from '@/lib/haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The one button every screen should use instead of a hand-rolled
 * `Pressable` + inline `styles.button` — see docs/DESIGN.md Section 3.1.
 * Consistent radius/padding/variant colors from the shared tokens, a real
 * disabled+loading state, and a light haptic tap (skipped on web, where
 * `expo-haptics` has nothing to drive) so the app has the small tactile
 * feel a "real" mobile app has and a website doesn't.
 */
export function Button({ title, variant = 'primary', loading, disabled, onPress, style, ...rest }: ButtonProps) {
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const danger = useThemeColor({}, 'danger');
  const dangerSurface = useThemeColor({}, 'dangerSurface');

  const isDisabled = disabled || loading;

  const backgroundColor = variant === 'primary' ? tint : variant === 'danger' ? dangerSurface : 'transparent';
  const textColor = variant === 'primary' ? onTint : variant === 'danger' ? danger : text;
  const borderColor = variant === 'secondary' ? border : variant === 'danger' ? danger : 'transparent';

  const handlePress: PressableProps['onPress'] = (e) => {
    tapFeedback();
    onPress?.(e);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor, borderColor, borderWidth: variant === 'primary' ? 0 : 1 },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText numberOfLines={1} style={[styles.text, { color: textColor }]}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: { fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
