import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import type { OrderAdminDetail } from '@/utils/db/adminOps';

type Props = {
  orders: OrderAdminDetail[];
  onSelect: (orderId: string) => void;
};

export function OrderAdminList({ orders, onSelect }: Props) {
  if (!orders || orders.length === 0) {
    return <Text style={styles.helperText}>No orders loaded yet.</Text>;
  }

  return (
    <View style={{ gap: 8 }}>
      {orders.map((order) => (
        <TouchableOpacity key={order.order_id} style={styles.card} onPress={() => onSelect(order.order_id)}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.title}>Order {order.order_id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.metaRow}>Restaurant: {order.restaurant_id ?? '—'}</Text>
              <Text style={styles.metaRow}>User: {order.user_id ?? '—'}</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, styles.badgeInfo]}>
                <Text style={[styles.badgeText, styles.badgeInfoText]}>{order.payment_status}</Text>
              </View>
              {order.driver_payout_status && (
                <View style={[styles.badge, styles.badgeNeutral]}>
                  <Text style={[styles.badgeText, styles.badgeNeutralText]}>{order.driver_payout_status}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.row}>Receipt: {order.receipt_url ? 'present' : 'missing'}</Text>
          <Text style={styles.row}>Restaurant payout: {order.restaurant_payout_status ?? '—'} | Driver payout: {order.driver_payout_status ?? '—'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default OrderAdminList;
