import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
  /** Switches the border to the danger token — pair with a small error message below the field. */
  error?: boolean;
};

/**
 * A plain `TextInput` has no opinion on color — it defaults to black text on
 * a transparent background. Sitting on a `ThemedView`/`Screen` (which turns
 * near-black in dark mode), that's black-on-black: invisible while typing.
 * This component is the fix, and the reason it exists as a shared component
 * rather than a per-screen style tweak: every future form input should use
 * this instead of a raw `TextInput`, so this bug class can't come back one
 * screen at a time.
 */
export function ThemedTextInput({
  style,
  lightColor,
  darkColor,
  placeholderTextColor,
  error,
  ...rest
}: ThemedTextInputProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const backgroundColor = useThemeColor({}, 'inputBackground');
  const border = useThemeColor({}, 'border');
  const danger = useThemeColor({}, 'danger');
  const placeholder = useThemeColor({}, 'placeholder');

  return (
    <TextInput
      style={[styles.base, { color, backgroundColor, borderColor: error ? danger : border }, style]}
      placeholderTextColor={placeholderTextColor ?? placeholder}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});
