import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { upsertPushToken } from '@/utils/database';

export function usePushRegistration(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;

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

      const token = await Notifications.getExpoPushTokenAsync();
      const platform = Platform.OS;
      if (token?.data) {
        await upsertPushToken(userId, token.data, platform);
      }
    };

    register();
  }, [userId]);
}
