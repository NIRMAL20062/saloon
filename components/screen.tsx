import type { PropsWithChildren } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';

type ScreenProps = PropsWithChildren<{ style?: StyleProp<ViewStyle> }>;

/**
 * Full-screen container that pads for the device's safe area (status bar,
 * notch, Android gesture/nav bar) on every side. `app.json` turns on
 * `edgeToEdgeEnabled` for Android, which means content draws *behind* the
 * system bars unless a screen explicitly insets itself — skipping this is
 * what caused headers/buttons to render underneath the status bar.
 *
 * Use this instead of a bare `ThemedView` as the outermost element of any
 * screen that sets `headerShown: false`. Screens with a native header
 * (`headerShown: true`) already get safe-area handling for free from
 * react-navigation and don't need this.
 */
export function Screen({ children, style }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ThemedView
      style={[
        styles.base,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
});
