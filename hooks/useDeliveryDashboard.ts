import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { getDriverByUserId, createDriverProfile, updateDriverOnlineStatus, getDriverStats } from '@/utils/database';
import { useDriverLocationTracking } from '@/hooks/useDriverLocationTracking';
import { DeliveryDriver, DeliveryStats, Delivery } from '@/types/database';

export function useDeliveryDashboard() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [stats, setStats] = useState<DeliveryStats>({
    todayEarnings: 0,
    completedDeliveries: 0,
    avgDeliveryTime: 0,
    rating: 0,
    totalEarnings: 0,
    totalDeliveries: 0,
    onlineHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerUnavailable, setOfferUnavailable] = useState<string | null>(null);
  const prevAvailable = useRef<number>(0);

  const {
    startTracking,
    stopTracking,
  } = useDriverLocationTracking({
    driverId: driver?.id,
    onError: setError,
  });

  const {
    deliveries,
    availableDeliveries,
    loading: deliveriesLoading,
    error: deliveriesError,
    acceptDelivery,
    updateDeliveryStatus,
    refetch: refetchDeliveries,
  } = useRealtimeDeliveries({
    driverId: driver?.id,
    includeAvailable: driver?.is_online || false,
  });

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [user]);

  useEffect(() => {
    if (driver) {
      loadStats();
    }
  }, [driver, deliveries]);

  useEffect(() => {
    if (driver?.is_online && !deliveries.length && availableDeliveries.length < prevAvailable.current) {
      setOfferUnavailable('Offer No Longer Available');
    }
    prevAvailable.current = availableDeliveries.length;
  }, [availableDeliveries.length, deliveries.length, driver?.is_online]);

  useEffect(() => {
    if (!driver?.id) return;
    if (driver.is_online) {
      startTracking();
    } else {
      stopTracking();
    }
  }, [driver?.id, driver?.is_online, startTracking, stopTracking]);

  const loadDriverData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let driverData = await getDriverByUserId(user.id);

      if (!driverData) {
        driverData = await createDriverProfile(user.id, 'PENDING-LICENSE', 'car', {
          documents_verified: false,
        });
      }

      if (!driverData) {
        setError('Failed to create driver profile');
        return;
      }

      setDriver(driverData);
    } catch (err) {
      console.error('Error loading driver data:', err);
      setError('Failed to load driver data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadStats = useCallback(async () => {
    if (!driver) return;

    try {
      const statsData = await getDriverStats(driver.id);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [driver]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDriverData(), refetchDeliveries()]);
    setRefreshing(false);
  }, [loadDriverData, refetchDeliveries]);

  const toggleOnlineStatus = useCallback(async () => {
    if (!driver) return;

    if (!driver.documents_verified) {
      Alert.alert(
        'Verification Required',
        'Your account is pending verification. Please complete profile and upload documents before going online.',
      );
      return;
    }

    try {
      const newStatus = !driver.is_online;
      const res = await updateDriverOnlineStatus(driver.id, newStatus);

      if (res.ok) {
        setDriver(prev => (prev ? { ...prev, is_online: newStatus } : null));

        if (newStatus) {
          const trackingStarted = await startTracking();
          if (!trackingStarted) {
            Alert.alert('Location Required', 'Please enable location permissions to go online.');
          }
        } else {
          stopTracking();
        }
      } else {
        Alert.alert('Error', res.error || 'Failed to update online status');
      }
    } catch (err) {
      console.error('Error toggling online status:', err);
      Alert.alert('Error', 'Failed to update online status');
    }
  }, [driver, startTracking, stopTracking]);

  const handleAcceptDelivery = useCallback(
    async (delivery: any) => {
      console.log('[acceptDelivery] start', { id: delivery.id, status: delivery.status });
      try {
        const result = await acceptDelivery(delivery.id);
        console.log('[acceptDelivery] result', result);

        if (result.ok) {
          await refetchDeliveries();
          console.log('[acceptDelivery] refetch triggered for delivery', delivery.id);
        } else {
          setOfferUnavailable('Offer No Longer Available');
          console.log('[acceptDelivery] failed', { id: delivery.id, message: result.message });
        }
      } catch (err) {
        console.error('Error accepting delivery:', err);
        console.log('[acceptDelivery] exception', { id: delivery.id, error: (err as Error)?.message });
        Alert.alert('Error', 'Failed to accept delivery');
      }
    },
    [acceptDelivery, refetchDeliveries],
  );

  const handleUpdateDeliveryStatus = useCallback(
    async (deliveryId: string, newStatus: Delivery['status']) => {
      try {
        const success = await updateDeliveryStatus(deliveryId, newStatus);

        if (success) {
          if (newStatus === 'delivered') {
            Alert.alert('Success', 'Delivery completed! Great job!');
            await loadStats();
          }
        } else {
          Alert.alert('Error', 'Failed to update delivery status');
        }
      } catch (err) {
        console.error('Error updating delivery status:', err);
        Alert.alert('Error', 'Failed to update delivery status');
      }
    },
    [loadStats, updateDeliveryStatus],
  );

  const callCustomer = useCallback((phone: string) => {
    console.log('Call customer:', phone);
    Alert.alert('Call Customer', `Would call: ${phone}`);
  }, []);

  const openNavigationToDestination = useCallback(async (address: string, latitude?: number | null, longitude?: number | null) => {
    const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
    const encodedAddress = encodeURIComponent(address);
    const googleTarget = hasCoords ? `${latitude},${longitude}` : encodedAddress;

    const googleUrl = Platform.select({
      ios: `comgooglemaps://?daddr=${googleTarget}&directionsmode=driving`,
      android: `google.navigation:q=${googleTarget}&mode=d`,
      web: `https://maps.google.com/maps?daddr=${googleTarget}&dirflg=d`,
    });

    const fallbackTarget = hasCoords ? googleTarget : encodedAddress;
    const fallbackUrl = Platform.select({
      ios: `https://maps.google.com/maps?daddr=${fallbackTarget}&dirflg=d`,
      android: `https://maps.google.com/maps?daddr=${fallbackTarget}&dirflg=d`,
      web: `https://maps.google.com/maps?daddr=${fallbackTarget}&dirflg=d`,
    });

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(googleUrl!, '_blank');
      }
      return;
    }

    try {
      const supported = await Linking.canOpenURL(googleUrl!);
      await Linking.openURL(supported ? googleUrl! : fallbackUrl!);
    } catch (err) {
      console.error('Error opening navigation:', err);
      Alert.alert('Navigation', 'Unable to open navigation app');
    }
  }, []);

  const navigateToDelivery = useCallback(
    (delivery: any) => {
      const toNumberOrNull = (val: any) => {
        const num = typeof val === 'number' ? val : parseFloat(val);
        return Number.isFinite(num) ? num : null;
      };

      const isPickupPhase = delivery.status === 'assigned';
      const targetAddress = isPickupPhase ? delivery.pickup_address : delivery.delivery_address;
      const targetLat = toNumberOrNull(isPickupPhase ? delivery.pickup_latitude : delivery.delivery_latitude);
      const targetLng = toNumberOrNull(isPickupPhase ? delivery.pickup_longitude : delivery.delivery_longitude);

      openNavigationToDestination(targetAddress, targetLat, targetLng);
    },
    [openNavigationToDestination],
  );

  const formatDeliveryForCard = useCallback((delivery: any) => ({
    id: delivery.id,
    restaurantName: delivery.order?.restaurant?.name || 'Unknown Restaurant',
    customerName: delivery.order?.user?.full_name || `Customer ${delivery.order?.user_id?.slice(-4) || '****'}`,
    customerPhone: delivery.order?.user?.phone || '',
    pickupAddress: delivery.pickup_address,
    deliveryAddress: delivery.delivery_address,
    distance: (() => {
      const kmValue =
        typeof delivery.distance_km === 'number' && !Number.isNaN(delivery.distance_km)
          ? delivery.distance_km
          : (() => {
              const parsed = typeof delivery.distance === 'number' ? delivery.distance : parseFloat(delivery.distance);
              return Number.isFinite(parsed) ? parsed : null;
            })();
      return kmValue !== null ? `${kmValue.toFixed(1)} km` : '– km';
    })(),
    estimatedTime: delivery.estimated_duration_minutes ? `${delivery.estimated_duration_minutes} min` : '15 min',
    payment: delivery.delivery_fee,
    items: delivery.order?.order_items?.map((item: any) => `${item.menu_item?.name || 'Unknown Item'} x${item.quantity}`) || [],
    status: delivery.status === 'assigned' || delivery.status === 'picked_up' ? ('active' as const) : ('available' as const),
  }), []);

  return {
    driver,
    stats,
    loading,
    refreshing,
    error,
    offerUnavailable,
    setOfferUnavailable,
    deliveries,
    availableDeliveries,
    deliveriesLoading,
    deliveriesError,
    handleRefresh,
    toggleOnlineStatus,
    handleAcceptDelivery,
    handleUpdateDeliveryStatus,
    callCustomer,
    navigateToDelivery,
    formatDeliveryForCard,
    refetchDeliveries,
  };
}
