import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { money } from '@/utils/adminUi';

type IssueRow = {
  id: string;
  order_id?: string;
  issue: string;
  status?: string | null;
  payment_status?: string | null;
  restaurant_id?: string | null;
  driver_id?: string | null;
  updated_at?: string | null;
};

type Props = {
  orders?: IssueRow[];
  deliveries?: IssueRow[];
  onSelectOrder?: (orderId: string) => void;
  onSelectDelivery?: (deliveryId: string) => void;
};

export function OrderIssues({ orders = [], deliveries = [], onSelectOrder, onSelectDelivery }: Props) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Order issues</Text>
      {orders.length === 0 ? (
        <Text style={styles.helper}>No order issues detected.</Text>
      ) : (
        orders.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={[styles.card, onSelectOrder ? styles.cardAction : null]}
            onPress={() => onSelectOrder && onSelectOrder(o.id)}
            accessibilityRole="button"
          >
            <Text style={styles.title}>Order {o.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.meta}>Issue: {o.issue}</Text>
            <Text style={styles.meta}>Status: {o.status} • Payment: {o.payment_status}</Text>
            {o.restaurant_id && <Text style={styles.meta}>Restaurant: {o.restaurant_id}</Text>}
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.sectionTitle}>Delivery issues</Text>
      {deliveries.length === 0 ? (
        <Text style={styles.helper}>No delivery issues detected.</Text>
      ) : (
        deliveries.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.card, onSelectDelivery ? styles.cardAction : null]}
            onPress={() => onSelectDelivery && onSelectDelivery(d.order_id ?? d.id)}
            accessibilityRole="button"
          >
            <Text style={styles.title}>Delivery {d.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.meta}>Issue: {d.issue}</Text>
            <Text style={styles.meta}>Status: {d.status}</Text>
            {d.driver_id && <Text style={styles.meta}>Driver: {d.driver_id}</Text>}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#111827' },
  helper: { color: '#6B7280', marginBottom: 8 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 8 },
  cardAction: { borderWidth: 1, borderColor: '#0F172A' },
  title: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  meta: { color: '#4B5563', fontSize: 13 },
});
