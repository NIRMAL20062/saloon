import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env, fill in your Supabase project values, and restart the dev server.'
  );
}

// Session tokens (JWT + refresh token) are persisted via the Android Keystore /
// iOS Keychain through expo-secure-store, never via plaintext AsyncStorage.
// See Claude-Context.md Section 5.1.
const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// SecureStore has no web implementation. GLIDE ships on Android only, but this
// keeps `expo start --web` usable for quick UI iteration during development.
const webStorageAdapter = {
  getItem: (key: string) =>
    Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorageAdapter : secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
