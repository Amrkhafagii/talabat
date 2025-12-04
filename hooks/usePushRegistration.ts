import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { upsertPushToken } from '@/utils/database';
import Constants from 'expo-constants';

export function usePushRegistration(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;
    if (Platform.OS === 'web') {
      // Web push requires VAPID keys configured in app.json; skip silently on web.
      return;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      // easConfig is available in dev clients / EAS builds
      (Constants as any)?.easConfig?.projectId;

    const register = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Push notifications permission not granted');
        return;
      }

      // If we don't have a valid projectId, skip registration to avoid runtime errors
      if (!projectId) {
        console.warn('Skipping push registration: missing EAS projectId');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      const platform = Platform.OS;
      if (token?.data) {
        const { success, error } = await upsertPushToken(userId, token.data, platform);
        if (!success) {
          console.warn('Failed to upsert push token', error);
        }
      }
    };

    register();
  }, [userId]);
}
