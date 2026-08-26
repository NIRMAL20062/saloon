import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function LoadingScreen() {
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const textMuted = useThemeColor({}, 'textMuted');

  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.logo, { backgroundColor: tint }, Shadow.glow]}>
          <Ionicons name="cut-sharp" size={32} color={onTint} />
        </View>
        <ThemedText type="title" style={styles.title}>
          GLIDE
        </ThemedText>
        <ActivityIndicator size="small" color={tint} style={styles.spinner} />
        <ThemedText style={[styles.caption, { color: textMuted }]}>
          Loading your session...
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  spinner: {
    marginTop: Spacing.md,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500',
  },
});
