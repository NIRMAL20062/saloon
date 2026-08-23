import { ActivityIndicator, StyleSheet } from 'react-native';

import { Screen } from '@/components/screen';

// Shown only in the brief window after a session appears (OTP just verified,
// or app resumed) while the profile row is being fetched to decide routing.
export default function LoadingScreen() {
  return (
    <Screen style={styles.container}>
      <ActivityIndicator size="large" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
