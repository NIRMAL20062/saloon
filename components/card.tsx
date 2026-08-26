import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';

import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type CardProps = ViewProps & Pick<PressableProps, 'onPress'>;

/**
 * A raised content block — replaces the `borderWidth: 1, borderColor: '#e2e2e2'`
 * card style that was copy-pasted across the partner/shop screens. Uses a
 * `surface` tone one step off the screen background (not just a border) plus
 * a real (if subtle) shadow, which is what actually reads as "a card" rather
 * than "a box with an outline." Pass `onPress` to get a tappable card (e.g. a
 * shop list row) with the same visuals instead of reaching for a separate
 * hand-styled `Pressable`.
 */
export function Card({ style, onPress, ...rest }: CardProps) {
  const backgroundColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'surfaceBorder');
  const themedStyle = [styles.base, { backgroundColor, borderColor }];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...themedStyle, pressed && styles.pressed, style]}
        {...(rest as PressableProps)}
      />
    );
  }

  return <View style={[...themedStyle, style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.card,
  },
  pressed: { opacity: 0.85 },
});
