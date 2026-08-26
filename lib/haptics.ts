import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * One shared wrapper instead of every screen importing `expo-haptics` and
 * deciding its own platform guard (docs/UX_EXPERIENCE.md's "Consistent
 * haptics on primary actions" note). `expo-haptics` has nothing to drive on
 * web, so this is a no-op there rather than a console warning.
 */
export function tapFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
