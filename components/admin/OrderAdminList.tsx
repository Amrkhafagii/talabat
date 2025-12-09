import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSBadge } from '@/components/ios/IOSBadge';
import type { OrderAdminDetail } from '@/utils/db/admin';

type Props = {
  orders: OrderAdminDetail[];
  onSelect: (orderId: string) => void;
};

export function OrderAdminList({ orders, onSelect }: Props) {
  if (!orders || orders.length === 0) {
    return <Text style={listStyles.helper}>No orders loaded yet.</Text>;
  }

  return (
    <View style={{ gap: iosSpacing.xs }}>
      {orders.map((order) => (
        <TouchableOpacity key={order.order_id} onPress={() => onSelect(order.order_id)}>
          <IOSCard padding="md" style={listStyles.card}>
            <View style={listStyles.headerRow}>
              <View>
                <Text style={listStyles.title}>Order {order.order_id.slice(-6).toUpperCase()}</Text>
                <Text style={listStyles.meta}>Restaurant: {order.restaurant_id ?? '—'}</Text>
                <Text style={listStyles.meta}>User: {order.user_id ?? '—'}</Text>
              </View>
              <View style={listStyles.badgeRow}>
                <IOSBadge label={order.payment_status} tone="info" />
                {order.driver_payout_status && <IOSBadge label={order.driver_payout_status} tone="neutral" />}
              </View>
            </View>
            <Text style={listStyles.body}>Receipt: {order.receipt_url ? 'present' : 'missing'}</Text>
            <Text style={listStyles.body}>Restaurant payout: {order.restaurant_payout_status ?? '—'} | Driver payout: {order.driver_payout_status ?? '—'}</Text>
          </IOSCard>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default OrderAdminList;

const listStyles = StyleSheet.create({
  helper: { ...iosTypography.caption, color: iosColors.secondaryText },
  card: { borderRadius: iosRadius.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: iosSpacing.sm },
  title: { ...iosTypography.subhead },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText },
  body: { ...iosTypography.caption },
  badgeRow: { flexDirection: 'row', gap: iosSpacing.xs, flexWrap: 'wrap' },
});
