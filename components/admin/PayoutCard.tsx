import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import { money } from '@/utils/adminUi';
import type { RestaurantPayable, DriverPayable } from '@/utils/db/admin';

type Props = {
  kind: 'restaurant' | 'driver';
  data: RestaurantPayable | DriverPayable;
  onRetry?: (orderId: string, ref?: string) => void;
};

export function PayoutCard({ kind, data, onRetry }: Props) {
  const isRest = kind === 'restaurant';
  const status = isRest ? (data as RestaurantPayable).restaurant_payout_status : (data as DriverPayable).driver_payout_status;
  const lastError = isRest ? (data as RestaurantPayable).restaurant_payout_last_error : (data as DriverPayable).driver_payout_last_error;
  const ref = isRest ? (data as RestaurantPayable).payout_ref : (data as DriverPayable).payout_ref;
  const amount = isRest
    ? money(Number((data as RestaurantPayable).restaurant_net ?? 0) + Number((data as RestaurantPayable).tip_amount ?? 0))
    : money(Number((data as DriverPayable).driver_payable ?? 0));

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.title}>{isRest ? (data as RestaurantPayable).restaurant_name || (data as RestaurantPayable).restaurant_id : (data as DriverPayable).driver_name || (data as DriverPayable).driver_id}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, styles.badgeNeutral]}>
            <Text style={[styles.badgeText, styles.badgeNeutralText]}>{status}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.metaRow}>Order: {data.order_id}</Text>
      <Text style={styles.row}>Amount due: {amount}</Text>
      {lastError && <Text style={[styles.row, styles.warningText]}>Last error: {lastError}</Text>}
      <Text style={styles.metaRow}>Ref: {ref ?? '—'}</Text>
      {onRetry && (
        <TouchableOpacity style={[styles.button, styles.buttonPrimary, { marginTop: 8 }]} onPress={() => onRetry(data.order_id, ref ?? undefined)}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default PayoutCard;
