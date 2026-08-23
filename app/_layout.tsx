import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
