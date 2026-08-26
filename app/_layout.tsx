import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

// React Navigation's own `DefaultTheme`/`DarkTheme` colors GLIDE never chose
// (pure black in dark mode, its own default blue tint) — anywhere a native
// header or an un-themed screen background shows through (e.g. the shop
// detail screen, which has no `Screen` wrapper), it was those generic
// colors, not `constants/theme.ts`'s palette. Rebuilding both themes from
// our own tokens means the native chrome always matches the rest of the app.
const NavigationLightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.surfaceBorder,
    primary: Colors.light.tint,
  },
};

const NavigationDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.surfaceBorder,
    primary: Colors.dark.tint,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? NavigationDarkTheme : NavigationLightTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Route protection via Stack.Protected (Expo Router's guard-based auth
// pattern, SDK 53+): every group is always declared, but only the one whose
// guard is true actually renders. See Claude-Context.md Phase 1 and the
// Expo Router authentication guide for why this replaced manual redirects.
function RootNavigator() {
  const { session, profile, initializing } = useAuth();

  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync();
  }, [initializing]);

  // Only true for the very first cold-start check — after that, transitions
  // between auth/onboarding/customer/partner are handled by the guards below,
  // with `loading` covering the brief profile re-fetch in between.
  if (initializing) return null;

  const hasSession = !!session;
  const profileChecked = profile !== undefined;
  const hasProfile = profileChecked && !!profile;
  const isCustomer = profile?.role === 'customer';
  const isPartner = profile?.role === 'partner';

  return (
    <Stack>
      <Stack.Protected guard={!hasSession}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={hasSession && !profileChecked}>
        <Stack.Screen name="loading" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={hasSession && profileChecked && !hasProfile}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={hasSession && isCustomer}>
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={hasSession && isPartner}>
        <Stack.Screen name="(partner)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
