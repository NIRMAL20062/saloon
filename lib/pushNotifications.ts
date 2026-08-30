import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Push-notification CAPABILITY only — requesting permission and getting a
 * real Expo push token. This is deliberately NOT Phase 8 (CLAUDE.md):
 * there's no `device_tokens` table, no `notifications` table, and nothing
 * here sends a real push tied to a booking event yet. That's real Phase 8
 * scope (built on top of Phases 6/7, which don't exist yet) and shouldn't
 * be pulled forward just because this piece exists — see CLAUDE.md Section
 * 2, rule 9.
 *
 * Why this needs a custom dev client, not plain Expo Go: Expo Go stopped
 * supporting remote push notifications on Android in recent SDK versions.
 * This only works in a build made via `expo prebuild` + `eas build` (or a
 * local native build) — see eas.json's "development" profile.
 *
 * Foreground display handler — shows a notification banner even while the
 * app is open, matching how a real booking alert should behave (Phase 8
 * will call this same setup once it exists).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushRegistrationResult =
  | { status: 'granted'; token: string }
  | { status: 'denied' }
  | { status: 'unsupported'; reason: string };

/**
 * Requests notification permission and returns a real Expo push token.
 *
 * HONEST LIMITATION: this was written without a physical device or EAS
 * project to test against — it follows Expo's documented pattern for
 * SDK 54, but has not been run and confirmed on a real phone. Two things
 * must happen before this can actually return a token, neither of which
 * can be done from this environment:
 *   1. `eas init` (or `eas build` for the first time) to link this project
 *      to a real EAS project id, which populates
 *      `Constants.expoConfig.extra.eas.projectId` — without it, this
 *      function returns `{ status: 'unsupported' }`.
 *   2. Running inside a real dev-client/production build on a physical
 *      device — `Device.isDevice` is false on an emulator, and Expo Go
 *      can't receive remote push at all (see the file-level comment).
 */
export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return { status: 'unsupported', reason: 'Push tokens require a physical device, not an emulator/simulator.' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return { status: 'denied' };
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    return {
      status: 'unsupported',
      reason: 'No EAS project id configured yet — run `eas init` first (see eas.json).',
    };
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  return { status: 'granted', token: tokenResponse.data };
}
