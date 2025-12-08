import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { useDriverLocationTracking } from '@/hooks/useDriverLocationTracking';
import { getDriverByUserId, releaseOrderPayment, getPushTokens } from '@/utils/database';
import { supabase } from '@/utils/supabase';
import { DeliveryDriver, Delivery } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import { sendPushNotification } from '@/utils/push';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import ProgressSteps from '@/components/ui/ProgressSteps';
import CtaBar from '@/components/ui/CtaBar';

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
  const theme = useRestaurantTheme();
  const { contentPadding } = useDeliveryLayout();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [currentDestination, setCurrentDestination] = useState<NavigationDestination | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydratingById, setHydratingById] = useState(false);
  const activeDeliveryRef = useRef<Delivery | null>(null);
  const pickupPromptedRef = useRef(false);
  const styles = useMemo(() => createStyles(theme, contentPadding), [theme, contentPadding]);
  const [summaryOpen, setSummaryOpen] = useState(true);

  const { deliveries, updateDeliveryStatus } = useRealtimeDeliveries({
    driverId: driver?.id,
    includeAvailable: false
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
    [normalizedStatus]
  );

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
          <Icon name="Navigation" size={64} color={theme.colors.textSubtle} />
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
        <Card style={styles.progressCard}>
          <Text style={[styles.cardTitle, styles.progressTitle]}>Status</Text>
          <ProgressSteps
            steps={[
              { key: 'assigned', label: 'Assigned', status: stepStatusFor('assigned') },
              { key: 'picked_up', label: 'Picked Up', status: stepStatusFor('picked_up') },
              { key: 'delivered', label: 'Delivered', status: stepStatusFor('delivered') },
            ]}
          />
        </Card>

        <Card style={styles.destinationCard}>
          <View style={styles.destinationHeader}>
            <View style={styles.destinationIcon}>
              {currentDestination.type === 'pickup' ? (
                <Icon name="Package" size="xl" color={theme.colors.accent} />
              ) : (
                <Icon name="MapPin" size="xl" color={theme.colors.success} />
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
              <Icon name="Navigation" size="md" color={theme.colors.textInverse} />
              <Text style={styles.navButtonText}>Google Maps</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.navButton, styles.appleMapsButton]}
                onPress={() => openInAppleMaps(currentDestination.address)}
              >
                <Icon name="MapPin" size="md" color={theme.colors.textInverse} />
                <Text style={styles.navButtonText}>Apple Maps</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.navButton, styles.wazeButton]}
              onPress={() => openInWaze(currentDestination.address)}
            >
              <Icon name="Navigation" size="md" color={theme.colors.textInverse} />
              <Text style={styles.navButtonText}>Waze</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.cardTitle}>Order Summary</Text>
            <TouchableOpacity onPress={() => setSummaryOpen(!summaryOpen)}>
              <Text style={styles.toggleText}>{summaryOpen ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {summaryOpen && (
            <>
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
                    {activeDelivery.distance_km ? `${activeDelivery.distance_km} km` : '—'}
                  </Text>
                </View>
              </View>

              {activeDelivery.order?.order_items && activeDelivery.order.order_items.length > 0 && (
                <View style={styles.summaryList}>
                  {activeDelivery.order.order_items.slice(0, 4).map((item) => (
                    <View key={item.id} style={styles.summaryRow}>
                      <Text style={styles.orderValue}>{item.menu_item?.name || 'Item'}</Text>
                      <Text style={styles.orderLabel}>x{item.quantity}</Text>
                    </View>
                  ))}
                  {activeDelivery.order.order_items.length > 4 && (
                    <Text style={styles.orderLabel}>+{activeDelivery.order.order_items.length - 4} more</Text>
                  )}
                </View>
              )}
            </>
          )}

          {currentDestination.type === 'delivery' && (
            <TouchableOpacity style={styles.callButton} onPress={callCustomer}>
              <Icon name="Phone" size="md" color={theme.colors.accent} />
              <Text style={styles.callButtonText}>Call Customer</Text>
            </TouchableOpacity>
          )}
        </Card>
      </View>

      <CtaBar
        label={
          activeDelivery.status === 'assigned'
            ? 'Mark as Picked Up'
            : activeDelivery.status === 'picked_up' || activeDelivery.status === 'on_the_way'
              ? 'Mark as Delivered'
              : 'Delivered'
        }
        onPress={
          activeDelivery.status === 'assigned'
            ? confirmMarkPickedUp
            : activeDelivery.status === 'picked_up' || activeDelivery.status === 'on_the_way'
              ? markDelivered
              : () => {}
        }
        disabled={
          !(
            activeDelivery.status === 'assigned' ||
            activeDelivery.status === 'picked_up' ||
            activeDelivery.status === 'on_the_way'
          )
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (
  theme: ReturnType<typeof useRestaurantTheme>,
  contentPadding: { horizontal: number; top: number; bottom: number }
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: contentPadding.horizontal,
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: contentPadding.horizontal,
      paddingTop: theme.spacing.md,
    },
    destinationCard: {
      marginBottom: theme.spacing.md,
    },
    destinationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    destinationIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    destinationInfo: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    destinationLabel: {
      ...theme.typography.subhead,
      color: theme.colors.text,
    },
    destinationAddress: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    navigationButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    navButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      gap: theme.spacing.xs,
    },
    googleMapsButton: {
      backgroundColor: theme.colors.primary[500],
    },
    appleMapsButton: {
      backgroundColor: theme.colors.accentStrong,
    },
    wazeButton: {
      backgroundColor: theme.colors.status.info,
    },
    navButtonText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.textInverse,
    },
    orderCard: {
      marginBottom: theme.spacing.md,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    cardTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
      marginBottom: 0,
    },
    toggleText: { ...theme.typography.caption, color: theme.colors.accent },
    orderInfo: {
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    orderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    orderLabel: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    orderValue: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '600',
    },
    callButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.md,
      gap: theme.spacing.xs,
    },
    callButtonText: {
      ...theme.typography.button,
      color: theme.colors.accent,
    },
    progressCard: {
      marginBottom: theme.spacing.md,
    },
    progressTitle: {
      marginBottom: theme.spacing.md,
    },
    summaryList: { gap: theme.spacing.xs },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  });
