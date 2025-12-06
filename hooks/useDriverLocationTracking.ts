import { useCallback, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

import { updateDriverLocation } from '@/utils/database';

type DriverLocationTrackingArgs = {
  driverId?: string;
  onError?: (message: string) => void;
  onLocation?: (coords: Location.LocationObjectCoords, timestamp: number) => void;
};

/**
 * Centralized driver location tracking so we can start/stop it from the dashboard
 * when a driver goes online, without relying on the dedicated location screen.
 */
export function useDriverLocationTracking({ driverId, onError, onLocation }: DriverLocationTrackingArgs) {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  const requestPermissions = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    // Background permission is helpful for continuous tracking; not fatal if denied.
    await Location.requestBackgroundPermissionsAsync().catch(() => null);
  }, []);

  const startTracking = useCallback(async () => {
    if (!driverId) return false;
    if (subscriptionRef.current) return true; // already tracking

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error('Location services are disabled');
      }

      await requestPermissions();

      // Try high accuracy first; fallback to last known to avoid hard failures on simulators.
      const current =
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }).catch(() => null)) ||
        (await Location.getLastKnownPositionAsync().catch(() => null));

      if (!current) {
        throw new Error('Unable to obtain current location');
      }

      await updateDriverLocation(driverId, current.coords.latitude, current.coords.longitude);
      onLocation?.(current.coords, current.timestamp || Date.now());

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000,
          distanceInterval: 50,
        },
        async (position) => {
          await updateDriverLocation(driverId, position.coords.latitude, position.coords.longitude);
          onLocation?.(position.coords, position.timestamp || Date.now());
        }
      );

      return true;
    } catch (err) {
      console.error('Error starting driver location tracking:', err);
      stopTracking();
      onError?.('Failed to start location tracking. Please enable location permissions and try again.');
      return false;
    }
  }, [driverId, onError, requestPermissions, stopTracking]);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    startTracking,
    stopTracking,
    isTracking: !!subscriptionRef.current,
  };
}
