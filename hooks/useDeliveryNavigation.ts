import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { useDriverLocationTracking } from '@/hooks/useDriverLocationTracking';
import { getDriverByUserId, releaseOrderPayment, getPushTokens } from '@/utils/database';
import { supabase } from '@/utils/supabase';
import { DeliveryDriver, Delivery } from '@/types/database';
import { sendPushNotification } from '@/utils/push';

interface NavigationDestination {
  address: string;
  latitude?: number;
  longitude?: number;
  type: 'pickup' | 'delivery';
  label: string;
}

const useParseNumber = () => useCallback((value?: number | string | null) => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}, []);

export function useDeliveryNavigation() {
  const { user } = useAuth();
  const { deliveryId: deliveryIdParam } = useLocalSearchParams<{ deliveryId?: string }>();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [currentDestination, setCurrentDestination] = useState<NavigationDestination | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydratingById, setHydratingById] = useState(false);
  const activeDeliveryRef = useRef<Delivery | null>(null);
  const pickupPromptedRef = useRef(false);
  const parseNumber = useParseNumber();
  const { deliveries, updateDeliveryStatus } = useRealtimeDeliveries({
    driverId: driver?.id,
    includeAvailable: false,
  });

  const normalizedStatus = useMemo<'assigned' | 'picked_up' | 'delivered'>(() => {
    const status = activeDelivery?.status;
    if (status === 'picked_up' || status === 'on_the_way') return 'picked_up';
    if (status === 'delivered') return 'delivered';
    return 'assigned';
  }, [activeDelivery?.status]);

  const stepStatusFor = useCallback(
    (stepKey: 'assigned' | 'picked_up' | 'delivered') => {
      const order: Array<'assigned' | 'picked_up' | 'delivered'> = ['assigned', 'picked_up', 'delivered'];
      const currentIndex = order.indexOf(normalizedStatus as 'assigned' | 'picked_up' | 'delivered');
      const targetIndex = order.indexOf(stepKey);

      if (currentIndex > targetIndex) return 'done';
      if (currentIndex === targetIndex) return 'current';
      return 'pending';
    },
    [normalizedStatus],
  );

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [user]);

  useEffect(() => {
    const active = deliveries.find(d => ['assigned', 'picked_up', 'on_the_way'].includes(d.status));
    setActiveDelivery(active || null);

    if (active) {
      if (active.status === 'assigned') {
        setCurrentDestination({
          address: active.pickup_address,
          latitude: parseNumber(active.pickup_latitude) ?? undefined,
          longitude: parseNumber(active.pickup_longitude) ?? undefined,
          type: 'pickup',
          label: 'Restaurant Pickup',
        });
      } else if (active.status === 'picked_up' || active.status === 'on_the_way') {
        setCurrentDestination({
          address: active.delivery_address,
          latitude: parseNumber(active.delivery_latitude) ?? undefined,
          longitude: parseNumber(active.delivery_longitude) ?? undefined,
          type: 'delivery',
          label: 'Customer Delivery',
        });
      }
    } else {
      setCurrentDestination(null);
    }
  }, [deliveries, parseNumber]);

  useEffect(() => {
    activeDeliveryRef.current = activeDelivery;
  }, [activeDelivery]);

  useEffect(() => {
    pickupPromptedRef.current = false;
  }, [activeDelivery?.id, activeDelivery?.status]);

  const hydrateFromParam = useCallback(async () => {
    if (!deliveryIdParam) return;
    try {
      setHydratingById(true);
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          order:orders(
            *,
            restaurant:restaurants(*),
            order_items(
              *,
              menu_item:menu_items(*)
            )
          )
        `)
        .eq('id', deliveryIdParam)
        .maybeSingle();

      if (error || !data) return;
      if (!['assigned', 'picked_up', 'on_the_way'].includes(data.status)) return;

      const pickupLat = parseNumber(data.pickup_latitude);
      const pickupLng = parseNumber(data.pickup_longitude);
      const dropLat = parseNumber(data.delivery_latitude);
      const dropLng = parseNumber(data.delivery_longitude);
      const destination =
        data.status === 'assigned'
          ? {
              address: data.pickup_address,
              latitude: pickupLat ?? undefined,
              longitude: pickupLng ?? undefined,
              type: 'pickup' as const,
              label: 'Restaurant Pickup',
            }
          : {
              address: data.delivery_address,
              latitude: dropLat ?? undefined,
              longitude: dropLng ?? undefined,
              type: 'delivery' as const,
              label: 'Customer Delivery',
            };

      setActiveDelivery(data as Delivery);
      activeDeliveryRef.current = data as Delivery;
      setCurrentDestination(destination);
    } finally {
      setHydratingById(false);
    }
  }, [deliveryIdParam, parseNumber]);

  useEffect(() => {
    if (activeDelivery || hydratingById) return;
    if (!deliveryIdParam) return;
    hydrateFromParam();
  }, [activeDelivery, hydratingById, deliveryIdParam, hydrateFromParam]);

  const loadDriverData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const driverData = await getDriverByUserId(user.id);
      setDriver(driverData);
    } catch (err) {
      console.error('Error loading driver data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const openInGoogleMaps = useCallback(async (address: string, latitude?: number | string | null, longitude?: number | string | null) => {
    const encodedAddress = encodeURIComponent(address);
    const latNum = typeof latitude === 'number' ? latitude : Number(latitude);
    const lngNum = typeof longitude === 'number' ? longitude : Number(longitude);
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
    const googleTarget = hasCoords ? `${latNum},${lngNum}` : encodedAddress;

    const url = Platform.select({
      ios: `comgooglemaps://?q=${googleTarget}&directionsmode=driving`,
      android: `google.navigation:q=${googleTarget}&mode=d`,
      web: `https://maps.google.com/maps?q=${googleTarget}&navigate=yes`,
    });

    const fallbackTarget = hasCoords ? googleTarget : encodedAddress;
    const fallbackUrl = Platform.select({
      ios: `https://maps.google.com/maps?q=${fallbackTarget}&dirflg=d`,
      android: `https://maps.google.com/maps?q=${fallbackTarget}&dirflg=d`,
      web: `https://maps.google.com/maps?q=${fallbackTarget}&dirflg=d`,
    });

    if (Platform.OS === 'web') {
      window.open(url!, '_blank');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url!);
      await Linking.openURL(supported ? url! : fallbackUrl!);
    } catch (err) {
      console.error('Error opening maps:', err);
      Alert.alert('Navigation', 'Unable to open navigation app');
    }
  }, []);

  const openInAppleMaps = useCallback(async (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `maps://?q=${encodedAddress}&dirflg=d`;
    const webFallback = `https://maps.google.com/maps?q=${encodedAddress}`;

    if (Platform.OS === 'web') {
      window.open(webFallback, '_blank');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      await Linking.openURL(supported ? url : webFallback);
    } catch (err) {
      console.error('Error opening Apple Maps:', err);
      Alert.alert('Navigation', 'Unable to open navigation app');
    }
  }, []);

  const openInWaze = useCallback(async (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `waze://?q=${encodedAddress}&navigate=yes`;
    const webUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;

    if (Platform.OS === 'web') {
      window.open(webUrl, '_blank');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      await Linking.openURL(supported ? url : webUrl);
    } catch (err) {
      console.error('Error opening Waze:', err);
      Alert.alert('Navigation', 'Unable to open navigation app');
    }
  }, []);

  const callCustomer = useCallback(() => {
    const phoneNumber = activeDelivery?.order?.user?.phone || '';

    if (!phoneNumber) {
      Alert.alert('Call Customer', 'No phone number available.');
      return;
    }

    if (Platform.OS === 'web') {
      window.open(`tel:${phoneNumber}`);
      return;
    }

    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Customer', 'Unable to start a call on this device.');
    });
  }, [activeDelivery?.order?.user?.phone]);

  const performMarkPickedUp = useCallback(
    async (deliveryParam?: Delivery | null) => {
      const delivery = deliveryParam ?? activeDeliveryRef.current ?? activeDelivery;
      if (!delivery) return;

      try {
        const success = await updateDeliveryStatus(delivery.id, 'picked_up');
        if (success) {
          const pickupTime = new Date().toISOString();
          const updatedDelivery: Delivery = { ...delivery, status: 'picked_up', picked_up_at: pickupTime };
          const dropLat = parseNumber(updatedDelivery.delivery_latitude);
          const dropLng = parseNumber(updatedDelivery.delivery_longitude);

          setActiveDelivery(updatedDelivery);
          activeDeliveryRef.current = updatedDelivery;
          setCurrentDestination({
            address: updatedDelivery.delivery_address,
            latitude: dropLat ?? undefined,
            longitude: dropLng ?? undefined,
            type: 'delivery',
            label: 'Customer Delivery',
          });

          const { data: tokens } = await getPushTokens([delivery.order?.user_id].filter(Boolean) as string[]);
          await Promise.all((tokens || []).map(token => sendPushNotification(token, 'Order Picked Up', 'Driver is on the way.', { orderId: delivery.order_id })));
          if (dropLat !== null && dropLng !== null) {
            openInGoogleMaps(updatedDelivery.delivery_address, dropLat, dropLng);
          } else {
            Alert.alert('Marked as picked up', 'Missing customer location, please navigate manually.');
          }
        } else {
          Alert.alert('Error', 'Failed to update delivery status');
        }
      } catch (err) {
        console.error('Error marking picked up:', err);
        Alert.alert('Error', 'Failed to update delivery status');
      }
    },
    [activeDelivery, openInGoogleMaps, parseNumber, updateDeliveryStatus],
  );

  const distanceInMeters = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c;
  }, []);

  const { startTracking, stopTracking } = useDriverLocationTracking({
    driverId: driver?.id,
    onError: (message) => Alert.alert('Location', message),
    onLocation: (coords) => {
      const delivery = activeDeliveryRef.current;
      if (!delivery || delivery.status !== 'assigned') return;

      const pickupLat = parseNumber(delivery.pickup_latitude);
      const pickupLng = parseNumber(delivery.pickup_longitude);
      if (pickupLat === null || pickupLng === null) return;

      const distance = distanceInMeters(pickupLat, pickupLng, coords.latitude, coords.longitude);
      if (distance <= 120 && !pickupPromptedRef.current) {
        pickupPromptedRef.current = true;
        Alert.alert(
          'Arrived at pickup?',
          'Mark the order as picked up to notify the customer and start dropoff navigation.',
          [
            { text: 'Not yet', style: 'cancel', onPress: () => { pickupPromptedRef.current = false; } },
            { text: 'Picked up', onPress: () => { performMarkPickedUp(delivery); } },
          ],
        );
      }
    },
  });

  const confirmMarkPickedUp = useCallback(() => {
    const delivery = activeDeliveryRef.current ?? activeDelivery;
    if (!delivery) return;

    Alert.alert(
      'Ready to go to the customer?',
      'We will mark the order as picked up and open navigation to the customer.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Yes, start delivery', onPress: () => performMarkPickedUp(delivery) },
      ],
    );
  }, [activeDelivery, performMarkPickedUp]);

  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  const markDelivered = useCallback(async () => {
    if (!activeDelivery) return;

    Alert.alert('Confirm Delivery', 'Mark this order as delivered?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delivered',
        onPress: async () => {
          try {
            const success = await updateDeliveryStatus(activeDelivery.id, 'delivered');
            if (success) {
              if (activeDelivery.order_id) {
                await releaseOrderPayment(activeDelivery.order_id);
                const { data: tokens } = await getPushTokens([activeDelivery.order?.user_id].filter(Boolean) as string[]);
                await Promise.all((tokens || []).map(token => sendPushNotification(token, 'Order Delivered', 'Your delivery has arrived.', { orderId: activeDelivery.order_id })));
              }
              Alert.alert('Success', 'Delivery completed! Payment released and you are available for new requests.');
            } else {
              Alert.alert('Error', 'Failed to update delivery status');
            }
          } catch (err) {
            console.error('Error marking delivered:', err);
            Alert.alert('Error', 'Failed to update delivery status');
          }
        },
      },
    ]);
  }, [activeDelivery, updateDeliveryStatus]);

  return {
    driver,
    activeDelivery,
    currentDestination,
    loading,
    normalizedStatus,
    stepStatusFor,
    openInGoogleMaps,
    openInAppleMaps,
    openInWaze,
    callCustomer,
    confirmMarkPickedUp,
    markDelivered,
  };
}
