import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Alert, Linking } from 'react-native';

import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { formatCurrency, formatOrderTime } from '@/utils/formatters';
import { getOrderItems } from '@/utils/orderHelpers';
import { supabase } from '@/utils/supabase';
import { getDriverById, grantDelayCreditIdempotent } from '@/utils/database';
import { createDeliveryEvent, logAudit, computeEtaBand, getBackupCandidates, logRerouteDecision, getDeliveryEventsByOrder } from '@/utils/db/trustedArrival';

const orderSteps = [
  { key: 'pending', label: 'Order Placed', icon: 'Store' },
  { key: 'confirmed', label: 'Order Confirmed', icon: 'Store' },
  { key: 'preparing', label: 'Preparing Food', icon: 'Clock' },
  { key: 'ready', label: 'Ready for Pickup', icon: 'MapPin' },
  { key: 'picked_up', label: 'Out for Delivery', icon: 'User' },
  { key: 'delivered', label: 'Delivered', icon: 'MapPin' },
];

const normalizeStatus = (status: string | null | undefined) => {
  if (status === 'on_the_way') return 'picked_up';
  if (status === 'pending') return 'pending';
  return status || 'pending';
};

export function useTrackOrder(orderId?: string) {
  const { orders, loading, error } = useRealtimeOrders({
    orderIds: orderId ? [orderId] : [],
  });

  const order = orders[0];
  const isDelivered = !!(
    order?.delivery?.status === 'delivered' ||
    order?.delivered_at ||
    order?.delivery?.delivered_at
  );
  const statusSource = order ? (isDelivered ? 'delivered' : order.delivery?.status ?? order.status) : null;
  const displayStatus = order ? normalizeStatus(statusSource) : null;
  const money = useCallback((val?: number | null) => formatCurrency(Number(val ?? 0)), []);
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

  useEffect(() => {
    const loadBackups = async () => {
      if (!order?.restaurant_id) return;
      const candidates = await getBackupCandidates(order.restaurant_id);
      if (candidates.length === 0) return;
      const first = candidates[0];
      if (!first.backup_restaurant) return;
      const deliveryTime =
        typeof first.backup_restaurant.delivery_time === 'string'
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
        idempotencyKey: `prep_delay_${order.id}`,
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
        idempotencyKey: `driver_delay_${order.id}`,
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

  const getCurrentStepIndex = useCallback(() => {
    if (!order) return -1;
    const normalized = normalizeStatus(isDelivered ? 'delivered' : order.delivery?.status ?? order.status);
    const idx = orderSteps.findIndex(step => step.key === normalized);
    return idx === -1 ? 0 : idx;
  }, [order, isDelivered]);

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

    fetchDriverLocation(driverId);

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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDriverLocation, order?.delivery?.driver_id]);

  const callRestaurant = useCallback(() => {
    const phoneNumber = order?.restaurant?.phone;
    if (!phoneNumber) {
      Alert.alert('Call Restaurant', 'Phone number not available.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Restaurant', 'Unable to start a call on this device.');
    });
  }, [order?.restaurant?.phone]);

  const callDriver = useCallback(() => {
    const phoneNumber = order?.delivery?.driver?.user?.phone;
    if (!phoneNumber) {
      Alert.alert('Call Driver', 'Phone number not available.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Driver', 'Unable to start a call on this device.');
    });
  }, [order?.delivery?.driver?.user?.phone]);

  const requestRefund = useCallback(async () => {
    if (!order || refundRequested) return;
    try {
      setRefundStatus('Requesting refund...');
      const { error: refundError } = await supabase.rpc('enqueue_order_refund', {
        p_order_id: order.id,
        p_reason: 'Customer requested refund after cancellation',
      });
      if (refundError) throw refundError;
      setRefundRequested(true);
      setRefundStatus('Refund requested. Awaiting admin confirmation.');
      Alert.alert('Refund requested', 'We sent your refund request to admin.');
    } catch (err) {
      console.error('Refund request failed', err);
      setRefundStatus('Refund request failed. Please retry later.');
      Alert.alert('Refund failed', 'Could not submit refund request. Please try again later.');
    }
  }, [order, refundRequested]);

  const openDriverInMaps = useCallback(() => {
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
  }, [driverLocation?.latitude, driverLocation?.longitude, order?.delivery?.driver?.current_latitude, order?.delivery?.driver?.current_longitude]);

  const etaDetails = useMemo(() => {
    if (!order) return { etaWindow: null as string | null, showTrustedEta: false, etaBandWidth: null as number | null, etaLastUpdated: null as number | null };
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
    return { etaWindow, showTrustedEta, etaBandWidth, etaLastUpdated };
  }, [order]);

  const handleAcceptDelayCredit = useCallback(async () => {
    if (!order?.user_id) return;
    setCreditStatus('issuing');
    const creditAmount = 10;
    const ok = await grantDelayCreditIdempotent(order.user_id, creditAmount, 'delay_credit', `delay_${order.id}`, order.id);
    if (ok) {
      setCreditStatus('issued');
      createDeliveryEvent({
        order_id: order.id,
        event_type: 'delay_credit_issued',
        payload: { amount: creditAmount },
        idempotencyKey: `delay_credit_${order.id}`,
      });
      logAudit('delay_credit_issued', 'wallet_transactions', undefined, { amount: creditAmount, order_id: order.id, idempotency_key: `delay_credit_${order.id}` }, order.user_id);
    } else {
      setCreditStatus('failed');
    }
  }, [order?.id, order?.user_id]);

  const handleApproveReroute = useCallback(async () => {
    if (!order || !backupPlan) return;
    setRerouteStatus('sent');
    await logRerouteDecision(order.id, backupPlan.restaurantId, 'approve', 'user_approved');
    Alert.alert('Plan B requested', `We will try rerouting to ${backupPlan.restaurantName}.`);
  }, [backupPlan, order]);

  const handleDeclineReroute = useCallback(async () => {
    if (!order || !backupPlan) return;
    setRerouteStatus('declined');
    await logRerouteDecision(order.id, backupPlan.restaurantId, 'decline', 'user_stay');
  }, [backupPlan, order]);

  return {
    order,
    displayStatus,
    money,
    canRequestRefund,
    driverLocation,
    delayReason,
    creditStatus,
    backupPlan,
    rerouteStatus,
    safetyEvents,
    etaAlert,
    refundRequested,
    refundStatus,
    loading,
    error,
    getCurrentStepIndex,
    requestRefund,
    openDriverInMaps,
    callRestaurant,
    callDriver,
    etaDetails,
    handleAcceptDelayCredit,
    handleApproveReroute,
    handleDeclineReroute,
    setRerouteStatus,
    setRefundRequested,
    setCreditStatus,
    formatOrderTime,
    getOrderItems,
  };
}

export { orderSteps };
