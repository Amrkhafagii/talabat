import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Navigation, MapPin, Phone, Package, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { useDriverLocationTracking } from '@/hooks/useDriverLocationTracking';
import { getDriverByUserId, releaseOrderPayment, getPushTokens } from '@/utils/database';
import { supabase } from '@/utils/supabase';
import { DeliveryDriver, Delivery } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import { sendPushNotification } from '@/utils/push';

interface NavigationDestination {
  address: string;
  latitude?: number;
  longitude?: number;
  type: 'pickup' | 'delivery';
  label: string;
}

export default function DeliveryNavigation() {
  const { user } = useAuth();
  const { deliveryId: deliveryIdParam } = useLocalSearchParams<{ deliveryId?: string }>();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [currentDestination, setCurrentDestination] = useState<NavigationDestination | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydratingById, setHydratingById] = useState(false);
  const activeDeliveryRef = useRef<Delivery | null>(null);
  const pickupPromptedRef = useRef(false);

  const { deliveries, updateDeliveryStatus } = useRealtimeDeliveries({
    driverId: driver?.id,
    includeAvailable: false
  });

  const parseNumber = (value?: number | null) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const distanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c; // meters
  };

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [user]);

  useEffect(() => {
    // Find the active delivery
    const active = deliveries.find(d => ['assigned', 'picked_up', 'on_the_way'].includes(d.status));
    setActiveDelivery(active || null);

    if (active) {
      // Determine current destination based on delivery status
      if (active.status === 'assigned') {
        console.log('[navigation] setting destination to pickup', {
          lat: parseNumber(active.pickup_latitude),
          lng: parseNumber(active.pickup_longitude),
        });
        setCurrentDestination({
          address: active.pickup_address,
          latitude: parseNumber(active.pickup_latitude) ?? undefined,
          longitude: parseNumber(active.pickup_longitude) ?? undefined,
          type: 'pickup',
          label: 'Restaurant Pickup'
        });
      } else if (active.status === 'picked_up' || active.status === 'on_the_way') {
        console.log('[navigation] setting destination to dropoff', {
          lat: parseNumber(active.delivery_latitude),
          lng: parseNumber(active.delivery_longitude),
        });
        setCurrentDestination({
          address: active.delivery_address,
          latitude: parseNumber(active.delivery_latitude) ?? undefined,
          longitude: parseNumber(active.delivery_longitude) ?? undefined,
          type: 'delivery',
          label: 'Customer Delivery'
        });
      }
    } else {
      setCurrentDestination(null);
    }
  }, [deliveries]);

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
  }, [deliveryIdParam]);

  useEffect(() => {
    if (activeDelivery || hydratingById) return;
    if (!deliveryIdParam) return;
    // If the realtime hook hasn't populated yet, hydrate from the passed deliveryId
    hydrateFromParam();
  }, [activeDelivery, hydratingById, deliveryIdParam, hydrateFromParam]);

  const loadDriverData = async () => {
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
  };

  const openInGoogleMaps = async (address: string, latitude?: number | string | null, longitude?: number | string | null) => {
    const encodedAddress = encodeURIComponent(address);
    const latNum = typeof latitude === 'number' ? latitude : Number(latitude);
    const lngNum = typeof longitude === 'number' ? longitude : Number(longitude);
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
    const googleTarget = hasCoords ? `${latNum},${lngNum}` : encodedAddress;

    console.log('[navigation] openInGoogleMaps', {
      address,
      latitude,
      longitude,
      parsedLat: hasCoords ? latNum : null,
      parsedLng: hasCoords ? lngNum : null,
      target: googleTarget,
    });

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
  };

  const openInAppleMaps = async (address: string) => {
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
  };

  const openInWaze = async (address: string) => {
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
  };

  const callCustomer = () => {
    const phoneNumber = '+15551234567'; // This should come from order data
    
    if (Platform.OS === 'web') {
      window.open(`tel:${phoneNumber}`);
      return;
    }

    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Customer', 'Unable to start a call on this device.');
    });
  };

  const performMarkPickedUp = async (deliveryParam?: Delivery | null) => {
    const delivery = deliveryParam ?? activeDeliveryRef.current ?? activeDelivery;
    if (!delivery) return;

    try {
      const success = await updateDeliveryStatus(delivery.id, 'picked_up');
      if (success) {
        const pickupTime = new Date().toISOString();
        const updatedDelivery: Delivery = { ...delivery, status: 'picked_up', picked_up_at: pickupTime };
        const dropLat = parseNumber(updatedDelivery.delivery_latitude);
        const dropLng = parseNumber(updatedDelivery.delivery_longitude);
        console.log('[navigation] mark picked up coords', { dropLat, dropLng, addr: updatedDelivery.delivery_address });

        // Keep local UI in sync immediately
        setActiveDelivery(updatedDelivery);
        activeDeliveryRef.current = updatedDelivery;
        setCurrentDestination({
          address: updatedDelivery.delivery_address,
          latitude: dropLat ?? undefined,
          longitude: dropLng ?? undefined,
          type: 'delivery',
          label: 'Customer Delivery'
        });

        // Notify customer that driver picked up
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
  };

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
          ]
        );
      }
    },
  });

  const confirmMarkPickedUp = () => {
    const delivery = activeDeliveryRef.current ?? activeDelivery;
    if (!delivery) return;

    Alert.alert(
      'Ready to go to the customer?',
      'We will mark the order as picked up and open navigation to the customer.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Yes, start delivery', onPress: () => performMarkPickedUp(delivery) },
      ]
    );
  };

  useEffect(() => {
    startTracking();
    return () => {
      stopTracking();
    };
  }, [startTracking, stopTracking]);

  const markDelivered = async () => {
    if (!activeDelivery) return;

    Alert.alert(
      'Confirm Delivery',
      'Mark this order as delivered?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delivered',
          onPress: async () => {
            try {
              const success = await updateDeliveryStatus(activeDelivery.id, 'delivered');
              if (success) {
                if (activeDelivery.order_id) {
                  await releaseOrderPayment(activeDelivery.order_id);
                  // Notify customer that order is delivered
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
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Navigation" showBackButton />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeDelivery || !currentDestination) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Navigation" showBackButton />
        <View style={styles.emptyState}>
          <Navigation size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No Active Delivery</Text>
          <Text style={styles.emptyText}>
            Accept a delivery to start navigation
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Navigation" showBackButton />

      <View style={styles.content}>
        {/* Current Destination */}
        <Card style={styles.destinationCard}>
          <View style={styles.destinationHeader}>
            <View style={styles.destinationIcon}>
              {currentDestination.type === 'pickup' ? (
                <Package size={24} color="#FF6B35" />
              ) : (
                <MapPin size={24} color="#10B981" />
              )}
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationLabel}>{currentDestination.label}</Text>
              <Text style={styles.destinationAddress}>{currentDestination.address}</Text>
            </View>
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, styles.googleMapsButton]}
              onPress={() => openInGoogleMaps(
                currentDestination.address,
                currentDestination.latitude,
                currentDestination.longitude
              )}
            >
              <Navigation size={20} color="#FFFFFF" />
              <Text style={styles.navButtonText}>Google Maps</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.navButton, styles.appleMapsButton]}
                onPress={() => openInAppleMaps(currentDestination.address)}
              >
                <MapPin size={20} color="#FFFFFF" />
                <Text style={styles.navButtonText}>Apple Maps</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.navButton, styles.wazeButton]}
              onPress={() => openInWaze(currentDestination.address)}
            >
              <Navigation size={20} color="#FFFFFF" />
              <Text style={styles.navButtonText}>Waze</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Order Details */}
        <Card style={styles.orderCard}>
          <Text style={styles.cardTitle}>Order Details</Text>
          
          <View style={styles.orderInfo}>
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Order #</Text>
              <Text style={styles.orderValue}>
                {activeDelivery.order?.order_number || `#${activeDelivery.id.slice(-6).toUpperCase()}`}
              </Text>
            </View>

            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Restaurant</Text>
              <Text style={styles.orderValue}>
                {activeDelivery.order?.restaurant?.name || 'Unknown Restaurant'}
              </Text>
            </View>

            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Earnings</Text>
              <Text style={styles.orderValue}>
                {formatCurrency(activeDelivery.driver_earnings)}
              </Text>
            </View>

            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Distance</Text>
              <Text style={styles.orderValue}>
                {activeDelivery.distance_km ? `${activeDelivery.distance_km} km` : '2.1 km'}
              </Text>
            </View>
          </View>

          {currentDestination.type === 'delivery' && (
            <TouchableOpacity style={styles.callButton} onPress={callCustomer}>
              <Phone size={20} color="#3B82F6" />
              <Text style={styles.callButtonText}>Call Customer</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Delivery Progress */}
        <Card style={styles.progressCard}>
          <Text style={styles.cardTitle}>Delivery Progress</Text>
          
          <View style={styles.progressSteps}>
            <View style={[styles.progressStep, styles.completedStep]}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.stepText}>Order Assigned</Text>
            </View>

            <View style={styles.progressLine} />

            <View style={[
              styles.progressStep,
              activeDelivery.status === 'picked_up' ? styles.completedStep : styles.currentStep
            ]}>
              {activeDelivery.status === 'picked_up' ? (
                <CheckCircle size={20} color="#10B981" />
              ) : (
                <Package size={20} color="#FF6B35" />
              )}
              <Text style={styles.stepText}>Pickup Complete</Text>
            </View>

            <View style={styles.progressLine} />

            <View style={[
              styles.progressStep,
              activeDelivery.status === 'delivered' ? styles.completedStep : styles.pendingStep
            ]}>
              <MapPin size={20} color={activeDelivery.status === 'delivered' ? '#10B981' : '#9CA3AF'} />
              <Text style={styles.stepText}>Delivered</Text>
            </View>
          </View>
        </Card>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {activeDelivery.status === 'assigned' ? (
            <Button
              title="Mark as Picked Up"
              onPress={confirmMarkPickedUp}
              style={styles.actionButton}
            />
          ) : (
            <Button
              title="Delivered to Customer"
              onPress={markDelivered}
              variant="secondary"
              style={styles.actionButton}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  destinationCard: {
    marginBottom: 16,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  destinationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  destinationAddress: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  googleMapsButton: {
    backgroundColor: '#4285F4',
  },
  appleMapsButton: {
    backgroundColor: '#007AFF',
  },
  wazeButton: {
    backgroundColor: '#33CCFF',
  },
  navButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  orderCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  orderInfo: {
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  orderValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter-Medium',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    gap: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  progressCard: {
    marginBottom: 16,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  completedStep: {
    opacity: 1,
  },
  currentStep: {
    opacity: 1,
  },
  pendingStep: {
    opacity: 0.5,
  },
  stepText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginTop: 4,
    textAlign: 'center',
  },
  progressLine: {
    height: 2,
    backgroundColor: '#E5E7EB',
    flex: 1,
    marginHorizontal: 8,
  },
  actionContainer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  actionButton: {
    marginBottom: 16,
  },
});
