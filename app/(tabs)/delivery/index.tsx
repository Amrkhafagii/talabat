import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, DollarSign, Clock, CircleCheck as CheckCircle, RefreshCw, Navigation, MapPin, History, ChartBar as BarChart3, Wallet } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/utils/supabase';

import StatCard from '@/components/common/StatCard';
import DeliveryCard from '@/components/delivery/DeliveryCard';
import Button from '@/components/ui/Button';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeDeliveries } from '@/hooks/useRealtimeDeliveries';
import { 
  getDriverByUserId, 
  createDriverProfile,
  updateDriverOnlineStatus,
  getDriverStats
} from '@/utils/database';
import { DeliveryDriver, DeliveryStats, Delivery } from '@/types/database';
import { useDriverLocationTracking } from '@/hooks/useDriverLocationTracking';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import ProgressSteps from '@/components/ui/ProgressSteps';
import SegmentedControl from '@/components/ui/SegmentedControl';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const { contentPadding, sectionGap } = useDeliveryLayout();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [stats, setStats] = useState<DeliveryStats>({
    todayEarnings: 0,
    completedDeliveries: 0,
    avgDeliveryTime: 0,
    rating: 0,
    totalEarnings: 0,
    totalDeliveries: 0,
    onlineHours: 0
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
  const styles = useMemo(() => createStyles(theme, contentPadding, sectionGap), [theme, contentPadding, sectionGap]);

  // Use realtime deliveries hook
  const {
    deliveries,
    availableDeliveries,
    loading: deliveriesLoading,
    error: deliveriesError,
    acceptDelivery,
    updateDeliveryStatus,
    refetch: refetchDeliveries
  } = useRealtimeDeliveries({
    driverId: driver?.id,
    includeAvailable: driver?.is_online || false
  });

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      const claims = data.session?.user?.app_metadata;
      console.log('[auth claims]', claims);
    });
  }, []);

  useEffect(() => {
    if (driver) {
      loadStats();
    }
  }, [driver, deliveries]); // Reload stats when deliveries change

  useEffect(() => {
    if (driver?.is_online && !deliveries.length && availableDeliveries.length < prevAvailable.current) {
      // An available offer disappeared while online and not active -> likely taken.
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

  const loadDriverData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let driverData = await getDriverByUserId(user.id);
      
      if (!driverData) {
        driverData = await createDriverProfile(
          user.id,
          'PENDING-LICENSE',
          'car',
          {
            documents_verified: false
          }
        );
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
  };

  const loadStats = async () => {
    if (!driver) return;

    try {
      const statsData = await getDriverStats(driver.id);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDriverData(),
      refetchDeliveries()
    ]);
    setRefreshing(false);
  };

  const toggleOnlineStatus = async () => {
    if (!driver) return;

    if (!driver.documents_verified) {
      Alert.alert(
        'Verification Required',
        'Your account is pending verification. Please complete profile and upload documents before going online.'
      );
      return;
    }

    try {
      const newStatus = !driver.is_online;
      const res = await updateDriverOnlineStatus(driver.id, newStatus);
      
      if (res.ok) {
        setDriver(prev => prev ? { ...prev, is_online: newStatus } : null);

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
  };

  const handleAcceptDelivery = async (delivery: any) => {
    console.log('[acceptDelivery] start', { id: delivery.id, status: delivery.status });
    try {
      const session = await supabase.auth.getSession();
      console.log('[acceptDelivery] app_metadata', session.data.session?.user?.app_metadata);
    } catch (claimErr) {
      console.log('[acceptDelivery] failed to read claims', (claimErr as Error)?.message);
    }
    try {
      const result = await acceptDelivery(delivery.id);
      console.log('[acceptDelivery] result', result);
      
      if (result.ok) {
        // Force-refresh lists so the delivery moves from "available" to "active"
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
  };

  const handleUpdateDeliveryStatus = async (deliveryId: string, newStatus: Delivery['status']) => {
    try {
      const success = await updateDeliveryStatus(deliveryId, newStatus);
      
      if (success) {
        if (newStatus === 'delivered') {
          Alert.alert('Success', 'Delivery completed! Great job!');
          await loadStats(); // Refresh stats after completion
        }
      } else {
        Alert.alert('Error', 'Failed to update delivery status');
      }
    } catch (err) {
      console.error('Error updating delivery status:', err);
      Alert.alert('Error', 'Failed to update delivery status');
    }
  };

  const callCustomer = (phone: string) => {
    console.log('Call customer:', phone);
    Alert.alert('Call Customer', `Would call: ${phone}`);
  };

  const openNavigationToDestination = async (address: string, latitude?: number | null, longitude?: number | null) => {
    const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
    const encodedAddress = encodeURIComponent(address);
    const googleTarget = hasCoords ? `${latitude},${longitude}` : encodedAddress;

    const googleUrl = Platform.select({
      ios: `comgooglemaps://?daddr=${googleTarget}&directionsmode=driving`,
      android: `google.navigation:q=${googleTarget}&mode=d`,
      web: `https://maps.google.com/maps?daddr=${googleTarget}&dirflg=d`,
    });

    // Prefer coordinates for the web fallback when available
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
  };

  const navigateToDelivery = (delivery: any) => {
    const toNumberOrNull = (val: any) => {
      const num = typeof val === 'number' ? val : parseFloat(val);
      return Number.isFinite(num) ? num : null;
    };

    const isPickupPhase = delivery.status === 'assigned';
    const targetAddress = isPickupPhase ? delivery.pickup_address : delivery.delivery_address;
    const targetLat = toNumberOrNull(isPickupPhase ? delivery.pickup_latitude : delivery.delivery_latitude);
    const targetLng = toNumberOrNull(isPickupPhase ? delivery.pickup_longitude : delivery.delivery_longitude);

    openNavigationToDestination(targetAddress, targetLat, targetLng);
  };

  const formatDeliveryForCard = (delivery: any) => ({
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
    items: delivery.order?.order_items?.map((item: any) => 
      `${item.menu_item?.name || 'Unknown Item'} x${item.quantity}`
    ) || [],
    status: delivery.status === 'assigned' || delivery.status === 'picked_up' ? 'active' as const : 'available' as const
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading delivery dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !driver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Driver profile not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDriverData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.statusPill} onPress={toggleOnlineStatus}>
            <View style={[styles.statusDot, { backgroundColor: driver.is_online ? theme.colors.success : theme.colors.status.error }]} />
            <Text style={styles.statusLabel}>{driver.is_online ? 'Online' : 'Offline'}</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.driverName}>{driver.user?.full_name || 'Driver'}</Text>
            <Text style={styles.subtle}>Order #{deliveries[0]?.order_id?.slice(-6).toUpperCase() || '—'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <RealtimeIndicator />
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw 
              size={20} 
              color={theme.colors.textMuted}
              style={refreshing ? styles.spinning : undefined}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.statsGrid}>
            <StatCard icon={DollarSign} value={`$${stats.todayEarnings.toFixed(2)}`} label="Earnings" />
            <StatCard icon={CheckCircle} value={stats.completedDeliveries} label="Deliveries" />
            <StatCard icon={Clock} value={`${stats.avgDeliveryTime}m`} label="Avg Time" />
            <StatCard icon={Truck} value={stats.rating.toFixed(1)} label="Rating" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/delivery/navigation')}>
              <Navigation size={20} color={theme.colors.accent} />
              <Text style={styles.actionText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/delivery/history')}>
              <History size={20} color={theme.colors.accent} />
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/delivery/earnings')}>
              <BarChart3 size={20} color={theme.colors.accent} />
              <Text style={styles.actionText}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/delivery/cash-reconciliation')}>
              <Wallet size={20} color={theme.colors.accent} />
              <Text style={styles.actionText}>Cash Recon</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/delivery/feedback')}>
              <MapPin size={20} color={theme.colors.accent} />
              <Text style={styles.actionText}>Feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/delivery/profile')}>
              <MapPin size={20} color={theme.colors.accent} />
              <Text style={styles.actionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {deliveries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Delivery</Text>
              <Text style={styles.liveIndicator}>Live</Text>
            </View>
            <View style={styles.progressWrap}>
              <ProgressSteps
                steps={[
                  { key: 'assigned', label: 'Assigned', status: 'done' },
                  { key: 'picked', label: 'Picked Up', status: deliveries[0].status === 'picked_up' ? 'current' : deliveries[0].status === 'delivered' ? 'done' : 'pending' },
                  { key: 'delivered', label: 'Delivered', status: deliveries[0].status === 'delivered' ? 'current' : 'pending' },
                ]}
              />
            </View>
            <View style={styles.activeActionsRow}>
              <Button
                title="Report Issue"
                variant="secondary"
                size="small"
                onPress={() => router.push({ pathname: '/(tabs)/delivery/issue-report', params: { deliveryId: deliveries[0]?.id } } as any)}
                style={styles.inlineButton}
                pill
              />
              <Button
                title="Cancel Order"
                variant="secondary"
                size="small"
                onPress={() => router.push({ pathname: '/(tabs)/delivery/cancel', params: { deliveryId: deliveries[0]?.id } } as any)}
                style={styles.inlineButton}
                pill
              />
            </View>
            <View style={styles.deliveryContainer}>
              {deliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  order={formatDeliveryForCard(delivery)}
                  onCall={delivery.order?.user?.phone ? () => callCustomer(delivery.order?.user?.phone || '') : undefined}
                  onNavigate={() => navigateToDelivery(delivery)}
                  onPickup={delivery.status === 'assigned' ? () => handleUpdateDeliveryStatus(delivery.id, 'picked_up') : undefined}
                  onComplete={delivery.status === 'picked_up' ? () => handleUpdateDeliveryStatus(delivery.id, 'delivered') : undefined}
                />
              ))}
            </View>
          </View>
        )}

        {driver.is_online && deliveries.length === 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Offers</Text>
              <Text style={styles.liveIndicator}>Live</Text>
            </View>
            <View style={styles.ordersContainer}>
              {deliveriesLoading && availableDeliveries.length === 0 ? (
                <View style={styles.deliveriesLoading}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.deliveriesLoadingText}>Looking for offers...</Text>
                </View>
              ) : availableDeliveries.length > 0 ? (
                availableDeliveries.map((delivery) => (
                  <DeliveryCard
                    key={delivery.id}
                    order={formatDeliveryForCard(delivery)}
                    onAccept={() => handleAcceptDelivery(delivery)}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No deliveries available</Text>
                  <Text style={styles.emptyText}>New requests will appear in real-time</Text>
                </View>
              )}

              {deliveriesError && (
                <View style={styles.errorState}>
                  <Text style={styles.errorStateText}>{deliveriesError}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {!driver.is_online && (
          <View style={styles.offlineState}>
            <Truck size={48} color={theme.colors.textMuted} />
            <Text style={styles.offlineTitle}>You&apos;re offline</Text>
            <Text style={styles.offlineText}>Go online to start receiving delivery requests</Text>
          </View>
        )}
      </ScrollView>

      {offerUnavailable && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Clock size={28} color={theme.colors.accent} />
            </View>
            <Text style={styles.modalTitle}>Offer No Longer Available</Text>
            <Text style={styles.modalText}>This offer was accepted by another driver just a moment ago.</Text>
            <Button title="See Other Offers" onPress={() => { setOfferUnavailable(null); handleRefresh(); }} fullWidth />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (
  theme: ReturnType<typeof useRestaurantTheme>,
  contentPadding: { horizontal: number; top: number; bottom: number },
  sectionGap: number
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
      paddingHorizontal: contentPadding.horizontal,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.sm,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: contentPadding.horizontal,
    },
    errorText: {
      ...theme.typography.body,
      color: theme.colors.status.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
    },
    retryButtonText: {
      ...theme.typography.button,
      color: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: contentPadding.horizontal,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    statusLabel: { ...theme.typography.caption, color: theme.colors.accent },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.md,
    },
    headerText: {
      flex: 1,
    },
    driverName: {
      ...theme.typography.titleM,
      color: theme.colors.text,
    },
    subtle: { ...theme.typography.caption, color: theme.colors.textMuted },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xxs,
      gap: theme.spacing.xs,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    refreshButton: {
      padding: theme.spacing.xs,
    },
    spinning: {
      transform: [{ rotate: '180deg' }],
    },
    section: {
      marginBottom: sectionGap,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: contentPadding.horizontal,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
      paddingHorizontal: contentPadding.horizontal,
      marginBottom: theme.spacing.md,
    },
    liveIndicator: {
      ...theme.typography.caption,
      color: theme.colors.success,
      backgroundColor: `${theme.colors.success}22`,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
    },
    progressWrap: { paddingHorizontal: contentPadding.horizontal, marginBottom: theme.spacing.md },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: contentPadding.horizontal - theme.spacing.sm,
      gap: theme.spacing.md,
    },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: contentPadding.horizontal - theme.spacing.sm,
      gap: theme.spacing.md,
    },
    actionCard: {
      width: '47%',
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.card,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    actionText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.text,
      marginTop: theme.spacing.xs,
    },
    deliveryContainer: {
      paddingHorizontal: contentPadding.horizontal,
      gap: theme.spacing.md,
    },
    activeActionsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: contentPadding.horizontal,
      marginTop: theme.spacing.sm,
    },
    inlineButton: { flex: 1 },
    ordersContainer: {
      paddingHorizontal: contentPadding.horizontal,
      gap: theme.spacing.md,
    },
    deliveriesLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    deliveriesLoadingText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl2,
      paddingHorizontal: theme.spacing.xl,
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
    errorState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      backgroundColor: `${theme.colors.status.error}11`,
      borderRadius: theme.radius.md,
      marginVertical: theme.spacing.sm,
    },
    errorStateText: {
      ...theme.typography.caption,
      color: theme.colors.status.error,
    },
    offlineState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl2,
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    offlineTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
    },
    offlineText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      padding: theme.spacing.xl,
      alignItems: 'center',
      gap: theme.spacing.sm,
      ...theme.shadows.card,
    },
    modalIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    modalTitle: { ...theme.typography.titleM, color: theme.colors.text },
    modalText: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  });
