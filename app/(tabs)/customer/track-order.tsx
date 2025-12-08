import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MapPin, Clock, User, Store, ShieldCheck } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import OrderStatusBadge from '@/components/common/OrderStatusBadge';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { formatCurrency, formatOrderTime } from '@/utils/formatters';
import { getOrderItems } from '@/utils/orderHelpers';
import { supabase } from '@/utils/supabase';
import { getDriverById, grantDelayCreditIdempotent } from '@/utils/database';
import { createDeliveryEvent, logAudit, computeEtaBand, getBackupCandidates, logRerouteDecision, getDeliveryEventsByOrder } from '@/utils/db/trustedArrival';
import { useAppTheme } from '@/styles/appTheme';

const orderSteps = [
  { key: 'pending', label: 'Order Placed', icon: Store },
  { key: 'confirmed', label: 'Order Confirmed', icon: Store },
  { key: 'preparing', label: 'Preparing Food', icon: Clock },
  { key: 'ready', label: 'Ready for Pickup', icon: MapPin },
  { key: 'picked_up', label: 'Out for Delivery', icon: User },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

const normalizeStatus = (status: string) => {
  if (status === 'on_the_way') return 'picked_up';
  if (status === 'pending') return 'pending';
  return status;
};

export default function TrackOrder() {
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;

  const { orders, loading, error } = useRealtimeOrders({
    orderIds: orderId ? [orderId] : []
  });

  const order = orders[0];
  const displayStatus = order ? normalizeStatus(order.status) : null;
  const money = (val?: number | null) => formatCurrency(Number(val ?? 0));
  const canRequestRefund = order?.status === 'cancelled' && ['paid', 'captured'].includes(order.payment_status || '');
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
    updatedAt?: string;
  } | null>(null);
  const [delayReason, setDelayReason] = useState<string | null>(null);
  const [creditStatus, setCreditStatus] = useState<'idle' | 'issuing' | 'issued' | 'failed'>('idle');
  const prepLoggedRef = useRef(false);
  const driverLoggedRef = useRef(false);
  const [backupPlan, setBackupPlan] = useState<{
    restaurantName: string;
    etaLabel: string;
    restaurantId: string;
  } | null>(null);
  const [rerouteStatus, setRerouteStatus] = useState<'idle' | 'sent' | 'declined'>('idle');
  const [safetyEvents, setSafetyEvents] = useState<{ temp?: string; handoff?: string }>({});
  const [etaAlert, setEtaAlert] = useState<string | null>(null);
  const [refundRequested, setRefundRequested] = useState(false);
  const [refundStatus, setRefundStatus] = useState<string | null>(null);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    const loadBackups = async () => {
      if (!order?.restaurant_id) return;
      const candidates = await getBackupCandidates(order.restaurant_id);
      if (candidates.length === 0) return;
      const first = candidates[0];
      if (!first.backup_restaurant) return;
      const deliveryTime = typeof first.backup_restaurant.delivery_time === 'string'
        ? parseInt(first.backup_restaurant.delivery_time, 10)
        : Number(first.backup_restaurant.delivery_time);
      const band = computeEtaBand({
        prepP50Minutes: deliveryTime ? Math.max(10, Math.round(deliveryTime * 0.4)) : 12,
        prepP90Minutes: deliveryTime ? Math.max(16, Math.round(deliveryTime * 0.65)) : 20,
        bufferMinutes: 4,
        travelMinutes: deliveryTime ? Math.max(8, deliveryTime / 2) : 15,
        reliabilityScore: first.backup_restaurant.rating ? Math.min(first.backup_restaurant.rating / 5, 1) : 0.9,
      });
      setBackupPlan({
        restaurantName: first.backup_restaurant.name,
        etaLabel: `${band.etaLowMinutes}-${band.etaHighMinutes} min`,
        restaurantId: first.backup_restaurant.id,
      });
    };
    loadBackups();
  }, [order?.restaurant_id]);

  useEffect(() => {
    if (!order) return;
    // Simple ETA health check: wide bands or stale timestamps
    if (order.eta_confidence_low && order.eta_confidence_high) {
      const low = new Date(order.eta_confidence_low).getTime();
      const high = new Date(order.eta_confidence_high).getTime();
      const bandMinutes = Math.abs(high - low) / 60000;
      if (bandMinutes > 35) {
        setEtaAlert('Arrival window is wide. We are monitoring for delays.');
      } else {
        setEtaAlert(null);
      }
    }
    const createdAt = order.created_at ? new Date(order.created_at).getTime() : null;
    if (createdAt) {
      const ageMinutes = (Date.now() - createdAt) / 60000;
      if (ageMinutes > 90 && !order.delivered_at && !order.cancelled_at) {
        setEtaAlert('Order ETA data may be stale—expect potential delays.');
      }
    }
    const now = Date.now();

    const etaHigh = order.eta_confidence_high ? new Date(order.eta_confidence_high).getTime() : null;
    const lastDriverUpdate = driverLocation?.updatedAt
      ? new Date(driverLocation.updatedAt).getTime()
      : order.delivery?.driver?.last_location_update
        ? new Date(order.delivery.driver.last_location_update).getTime()
        : null;

    const isPrepPhase = ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);
    const isDriverPhase = ['picked_up', 'on_the_way'].includes(order.status);

    if (etaHigh && isPrepPhase && now > etaHigh && !prepLoggedRef.current) {
      setDelayReason('Kitchen behind');
      prepLoggedRef.current = true;
      createDeliveryEvent({
        order_id: order.id,
        event_type: 'prep_delay_detected',
        payload: { eta_high: order.eta_confidence_high },
        idempotencyKey: `prep_delay_${order.id}`
      });
      logAudit('prep_delay_detected', 'orders', order.id, { eta_high: order.eta_confidence_high, idempotency_key: `prep_delay_${order.id}` });
    } else if (isDriverPhase && lastDriverUpdate && now - lastDriverUpdate > 5 * 60 * 1000 && !driverLoggedRef.current) {
      setDelayReason('Driver delay (traffic spike)');
      driverLoggedRef.current = true;
      createDeliveryEvent({
        order_id: order.id,
        driver_id: order.delivery?.driver_id,
        event_type: 'driver_delay_detected',
        payload: { last_update: lastDriverUpdate },
        idempotencyKey: `driver_delay_${order.id}`
      });
      logAudit('driver_delay_detected', 'deliveries', order.delivery?.id, { order_id: order.id, last_update: lastDriverUpdate, idempotency_key: `driver_delay_${order.id}` });
    } else if (!delayReason) {
      setDelayReason(null);
    }
  }, [order, driverLocation, delayReason]);

  useEffect(() => {
    const loadEvents = async () => {
      if (!order?.id) return;
      const events = await getDeliveryEventsByOrder(order.id);
      const temp = events.find(e => e.event_type === 'temp_check');
      const handoff = events.find(e => e.event_type === 'handoff_confirmation');
      setSafetyEvents({
        temp: temp?.payload?.passed ? temp.created_at : undefined,
        handoff: handoff?.payload?.confirmed ? handoff.created_at : undefined,
      });
    };
    loadEvents();
  }, [order?.id]);

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    const normalized = normalizeStatus(order.status);
    const idx = orderSteps.findIndex(step => step.key === normalized);
    return idx === -1 ? 0 : idx;
  };

  const fetchDriverLocation = useCallback(async (driverId: string) => {
    const driverRecord = await getDriverById(driverId);
    if (driverRecord?.current_latitude && driverRecord?.current_longitude) {
      setDriverLocation({
        latitude: driverRecord.current_latitude,
        longitude: driverRecord.current_longitude,
        updatedAt: driverRecord.last_location_update || undefined,
      });
    }
  }, []);

  useEffect(() => {
    const driverId = order?.delivery?.driver_id;
    if (!driverId) return;

    // Fetch initial location
    fetchDriverLocation(driverId);

    // Subscribe to driver location updates
    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_drivers',
          filter: `id=eq.${driverId}`,
        },
        (payload: any) => {
          const newRecord = payload.new as any;
          if (newRecord.current_latitude && newRecord.current_longitude) {
            setDriverLocation({
              latitude: newRecord.current_latitude,
              longitude: newRecord.current_longitude,
              updatedAt: newRecord.last_location_update,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDriverLocation, order?.delivery?.driver_id]);

  const callRestaurant = () => {
    const phoneNumber = order?.restaurant?.phone;
    if (!phoneNumber) {
      Alert.alert('Call Restaurant', 'Phone number not available.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Restaurant', 'Unable to start a call on this device.');
    });
  };

  const callDriver = () => {
    const phoneNumber = order?.delivery?.driver?.user?.phone;
    if (!phoneNumber) {
      Alert.alert('Call Driver', 'Phone number not available.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Driver', 'Unable to start a call on this device.');
    });
  };

  const requestRefund = async () => {
    if (!order || refundRequested) return;
    try {
      setRefundStatus('Requesting refund...');
      const { error } = await supabase.rpc('enqueue_order_refund', {
        p_order_id: order.id,
        p_reason: 'Customer requested refund after cancellation',
      });
      if (error) throw error;
      setRefundRequested(true);
      setRefundStatus('Refund requested. Awaiting admin confirmation.');
      Alert.alert('Refund requested', 'We sent your refund request to admin.');
    } catch (err) {
      console.error('Refund request failed', err);
      setRefundStatus('Refund request failed. Please retry later.');
      Alert.alert('Refund failed', 'Could not submit refund request. Please try again later.');
    }
  };

  const openDriverInMaps = () => {
    const lat = driverLocation?.latitude || order?.delivery?.driver?.current_latitude;
    const lng = driverLocation?.longitude || order?.delivery?.driver?.current_longitude;
    if (!lat || !lng) {
      Alert.alert('Live Location', 'Driver location not available yet.');
      return;
    }
    const url = `https://maps.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Live Location', 'Unable to open maps.');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Track Order" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Track Order" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const driver = order.delivery?.driver;
  const etaWindow = order.eta_confidence_low && order.eta_confidence_high
    ? `${new Date(order.eta_confidence_low).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(order.eta_confidence_high).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : order.eta_promised
      ? new Date(order.eta_promised).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;
  const etaBandWidth = order.eta_confidence_low && order.eta_confidence_high
    ? (new Date(order.eta_confidence_high).getTime() - new Date(order.eta_confidence_low).getTime()) / (1000 * 60)
    : null;
  const etaLastUpdated = order.updated_at ? new Date(order.updated_at).getTime() : new Date(order.created_at).getTime();
  const etaStillRelevant = order.eta_confidence_high
    ? new Date(order.eta_confidence_high).getTime() > Date.now() + 2 * 60 * 1000
    : false;
  const etaFresh = Date.now() - etaLastUpdated < 30 * 60 * 1000;
  const showTrustedEta = etaBandWidth !== null ? etaBandWidth <= 20 && etaStillRelevant && etaFresh : false;

  const handleAcceptDelayCredit = async () => {
    if (!order?.user_id) return;
    setCreditStatus('issuing');
    const creditAmount = 10; // flat goodwill credit
    const ok = await grantDelayCreditIdempotent(order.user_id, creditAmount, 'delay_credit', `delay_${order.id}`, order.id);
    if (ok) {
      setCreditStatus('issued');
      createDeliveryEvent({
        order_id: order.id,
        event_type: 'delay_credit_issued',
        payload: { amount: creditAmount },
        idempotencyKey: `delay_credit_${order.id}`
      });
      logAudit('delay_credit_issued', 'wallet_transactions', undefined, { amount: creditAmount, order_id: order.id, idempotency_key: `delay_credit_${order.id}` }, order.user_id);
    } else {
      setCreditStatus('failed');
    }
  };

  const handleApproveReroute = async () => {
    if (!order || !backupPlan) return;
    setRerouteStatus('sent');
    await logRerouteDecision(order.id, backupPlan.restaurantId, 'approve', 'user_approved');
    Alert.alert('Plan B requested', `We will try rerouting to ${backupPlan.restaurantName}.`);
  };

  const handleDeclineReroute = async () => {
    if (!order || !backupPlan) return;
    setRerouteStatus('declined');
    await logRerouteDecision(order.id, backupPlan.restaurantId, 'decline', 'user_stay');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Track Order" 
        showBackButton 
        rightComponent={<RealtimeIndicator />}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.orderNumber}>Order #{order.id.slice(-6).toUpperCase()}</Text>
            <OrderStatusBadge status={displayStatus || order.status} size="large" />
          </View>
          {etaAlert && <Text style={styles.warningText}>{etaAlert}</Text>}
          {canRequestRefund && (
            <View style={styles.refundBox}>
              <Text style={styles.refundText}>Order cancelled after payment. You can request a refund.</Text>
              <Button
                title={refundRequested ? 'Refund requested' : 'Request refund'}
                onPress={requestRefund}
                disabled={refundRequested}
                style={styles.refundButton}
              />
              {refundStatus && <Text style={styles.refundStatus}>{refundStatus}</Text>}
            </View>
          )}
          <Text style={styles.restaurantName}>{order.restaurant?.name}</Text>
          <Text style={styles.orderTime}>Ordered {formatOrderTime(order.created_at)}</Text>
          {etaWindow && showTrustedEta && (
            <View style={styles.trustedEta}>
              <ShieldCheck size={16} color={theme.colors.status.success} />
              <Text style={styles.trustedEtaText}>Trusted arrival {etaWindow}</Text>
            </View>
          )}
          {safetyEvents.temp && (
            <Text style={styles.safetyLine}>
              Temp check passed at {new Date(safetyEvents.temp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
          {safetyEvents.handoff && (
            <Text style={styles.safetyLine}>
              Handoff confirmed at {new Date(safetyEvents.handoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
          {order.estimated_delivery_time && (
            <Text style={styles.estimatedTime}>
              Estimated delivery: {order.estimated_delivery_time}
            </Text>
          )}
        </Card>

        {delayReason && (
          <Card style={styles.delayCard}>
            <View style={styles.delayHeader}>
              <Text style={styles.delayTitle}>{delayReason}</Text>
              <Text style={styles.delayBadge}>Monitoring</Text>
            </View>
            <Text style={styles.delayText}>
              We spotted a risk to your ETA. You can accept a small credit while we keep pushing this order.
            </Text>
            <Button
              title={creditStatus === 'issued' ? 'Credit applied' : creditStatus === 'issuing' ? 'Applying credit...' : 'Accept delay for credit'}
              onPress={handleAcceptDelayCredit}
              disabled={creditStatus === 'issuing' || creditStatus === 'issued'}
              style={styles.delayButton}
            />
            {creditStatus === 'failed' && (
              <Text style={styles.delayError}>Could not apply credit. Please try again.</Text>
            )}
            {backupPlan && (
              <View style={styles.planB}>
                <Text style={styles.planBTitle}>Plan B: {backupPlan.restaurantName}</Text>
                <Text style={styles.planBSubtitle}>Ready in {backupPlan.etaLabel}. Original may slip past current window.</Text>
                <View style={styles.planBActions}>
                  <Button
                    title={rerouteStatus === 'sent' ? 'Plan B requested' : 'Approve reroute'}
                    onPress={handleApproveReroute}
                    disabled={rerouteStatus === 'sent'}
                  />
                  <Button
                    title="Stay and wait"
                    variant="outline"
                    onPress={handleDeclineReroute}
                  />
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Order Progress */}
        <Card style={styles.progressCard}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
          <View style={styles.progressContainer}>
            {orderSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <View key={step.key} style={styles.progressStep}>
                  <View style={styles.stepIconContainer}>
                    <View style={[
                      styles.stepIcon,
                      isCompleted && styles.stepIconCompleted,
                      isCurrent && styles.stepIconCurrent
                    ]}>
                      <StepIcon 
                        size={16} 
                        color={isCompleted ? theme.colors.textInverse : theme.colors.textSubtle} 
                      />
                    </View>
                    {index < orderSteps.length - 1 && (
                      <View style={[
                        styles.stepLine,
                        isCompleted && styles.stepLineCompleted
                      ]} />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[
                      styles.stepLabel,
                      isCompleted && styles.stepLabelCompleted
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.stepStatus}>In Progress</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Driver Information */}
        {driver && ['picked_up', 'on_the_way'].includes(order.status) && (
          <Card style={styles.driverCard}>
            <Text style={styles.sectionTitle}>Your Driver</Text>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <User size={24} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>
                  {driver.user?.full_name || 'Driver'}
                </Text>
                <Text style={styles.driverRating}>
                  ⭐ {driver.rating.toFixed(1)} • {driver.total_deliveries} deliveries
                </Text>
                <Text style={styles.driverVehicle}>
                  {driver.vehicle_type.charAt(0).toUpperCase() + driver.vehicle_type.slice(1)}
                  {driver.vehicle_color && ` • ${driver.vehicle_color}`}
                </Text>
              </View>
              <Button
                title="Call"
                onPress={callDriver}
                size="small"
                variant="outline"
              />
            </View>

            {/* Live location */}
            {(driverLocation || driver.current_latitude) && (
              <View style={styles.liveLocation}>
                <View style={styles.liveLocationText}>
                  <Text style={styles.liveLocationLabel}>Live location</Text>
                  <Text style={styles.liveLocationValue}>
                    {(
                      driverLocation?.latitude || driver.current_latitude
                    )?.toFixed(4)}
                    ,{' '}
                    {(
                      driverLocation?.longitude || driver.current_longitude
                    )?.toFixed(4)}
                  </Text>
                  {driverLocation?.updatedAt && (
                    <Text style={styles.liveLocationMeta}>
                      Updated {new Date(driverLocation.updatedAt).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
                <Button
                  title="Open in Maps"
                  onPress={openDriverInMaps}
                  size="small"
                  variant="secondary"
                />
              </View>
            )}
          </Card>
        )}

        {/* Order Items */}
        <Card style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsList}>
            {getOrderItems(order).map((item, index) => (
              <Text key={index} style={styles.orderItem}>• {item}</Text>
            ))}
          </View>
          <View style={styles.chargeBreakdown}>
            {[
              { label: 'Subtotal', value: order.subtotal },
              { label: 'Delivery', value: order.delivery_fee },
              { label: 'Tax', value: order.tax_amount },
              { label: 'Tip', value: order.tip_amount },
              { label: 'Platform fee', value: order.platform_fee },
            ].map(row => (
              <View key={row.label} style={styles.chargeRow}>
                <Text style={styles.chargeLabel}>{row.label}</Text>
                <Text style={styles.chargeValue}>{money(row.value)}</Text>
              </View>
            ))}
            <View style={styles.chargeDivider} />
            <View style={styles.chargeRow}>
              <Text style={styles.chargeTotalLabel}>Total charged</Text>
              <Text style={styles.chargeTotalValue}>{money(order.total_charged ?? order.total)}</Text>
            </View>
          </View>
        </Card>

        {/* Delivery Address */}
        <Card style={styles.addressCard}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressInfo}>
            <MapPin size={20} color={theme.colors.primary[500]} />
            <Text style={styles.addressText}>{order.delivery_address}</Text>
          </View>
          {order.delivery_instructions && (
            <Text style={styles.deliveryInstructions}>
              Instructions: {order.delivery_instructions}
            </Text>
          )}
        </Card>

        {/* Contact Actions */}
        <Card style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          <View style={styles.contactActions}>
            <Button
              title="Call Restaurant"
              onPress={callRestaurant}
              variant="outline"
              style={styles.contactButton}
            />
            {driver && (
              <Button
                title="Call Driver"
                onPress={callDriver}
                variant="outline"
                style={styles.contactButton}
              />
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginTop: 12,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    statusCard: {
      marginBottom: 16,
    },
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    orderNumber: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    restaurantName: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      marginBottom: 4,
    },
    orderTime: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    trustedEta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
      padding: 10,
      backgroundColor: theme.colors.statusSoft.success,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.status.success,
    },
    trustedEtaText: {
      fontSize: 14,
      color: theme.colors.status.success,
      fontFamily: 'Inter-SemiBold',
    },
    safetyLine: {
      fontSize: 12,
      color: theme.colors.status.success,
      fontFamily: 'Inter-Medium',
      marginTop: 4,
    },
    estimatedTime: {
      fontSize: 14,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-SemiBold',
      marginTop: 4,
    },
    delayCard: {
      marginBottom: 16,
      backgroundColor: theme.colors.statusSoft.warning,
      borderColor: theme.colors.status.warning,
      borderWidth: 1,
    },
    delayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    delayTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.status.warning,
    },
    delayBadge: {
      fontSize: 12,
      color: theme.colors.status.warning,
      backgroundColor: theme.colors.statusSoft.warning,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      fontFamily: 'Inter-Medium',
    },
    delayText: {
      fontSize: 14,
      color: theme.colors.status.warning,
      fontFamily: 'Inter-Regular',
      marginBottom: 12,
    },
    delayButton: {
      marginBottom: 8,
    },
    delayError: {
      fontSize: 12,
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
    },
    planB: {
      marginTop: 12,
      backgroundColor: theme.colors.surfaceAlt,
      padding: 12,
      borderRadius: 10,
      gap: 6,
    },
    planBTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: theme.colors.text,
    },
    planBSubtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    planBActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    progressCard: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    progressContainer: {
      paddingLeft: 8,
    },
    progressStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    stepIconContainer: {
      alignItems: 'center',
      marginRight: 16,
    },
    stepIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepIconCompleted: {
      backgroundColor: theme.colors.status.success,
    },
    stepIconCurrent: {
      backgroundColor: theme.colors.primary[500],
    },
    stepLine: {
      width: 2,
      height: 24,
      backgroundColor: theme.colors.border,
      marginTop: 4,
    },
    stepLineCompleted: {
      backgroundColor: theme.colors.status.success,
    },
    stepContent: {
      flex: 1,
      paddingTop: 4,
    },
    stepLabel: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.textMuted,
    },
    stepLabelCompleted: {
      color: theme.colors.text,
    },
    stepStatus: {
      fontSize: 12,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-Regular',
      marginTop: 2,
    },
    driverCard: {
      marginBottom: 16,
    },
    driverInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    driverAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary[100],
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    driverDetails: {
      flex: 1,
    },
    liveLocation: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    liveLocationText: {
      flex: 1,
    },
    liveLocationLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Medium',
    },
    liveLocationValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-SemiBold',
    },
    liveLocationMeta: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginTop: 2,
    },
    driverName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 2,
    },
    driverRating: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginBottom: 2,
    },
    driverVehicle: {
      fontSize: 12,
      color: theme.colors.textSubtle,
      fontFamily: 'Inter-Regular',
    },
    itemsCard: {
      marginBottom: 16,
    },
    itemsList: {
      marginBottom: 16,
    },
    orderItem: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
      marginBottom: 4,
    },
    chargeBreakdown: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
      gap: 6,
    },
    chargeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chargeLabel: {
      fontSize: 13,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
    },
    chargeValue: {
      fontSize: 13,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    chargeDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 4,
    },
    chargeTotalLabel: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    chargeTotalValue: {
      fontSize: 14,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    addressCard: {
      marginBottom: 16,
    },
    addressInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Regular',
      marginLeft: 8,
      flex: 1,
      lineHeight: 20,
    },
    deliveryInstructions: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      fontStyle: 'italic',
      marginTop: 8,
      paddingLeft: 28,
    },
    contactCard: {
      marginBottom: 32,
    },
    contactActions: {
      flexDirection: 'row',
      gap: 12,
    },
    contactButton: {
      flex: 1,
    },
    warningText: {
      color: theme.colors.status.warning,
      fontWeight: '600',
      marginBottom: 6,
    },
    refundBox: {
      backgroundColor: theme.colors.statusSoft.warning,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
    },
    refundText: {
      color: theme.colors.status.warning,
      marginBottom: 8,
      fontFamily: 'Inter-Regular',
    },
    refundButton: {
      marginTop: 4,
    },
    refundStatus: {
      color: theme.colors.textMuted,
      marginTop: 6,
      fontFamily: 'Inter-Regular',
    },
  });
