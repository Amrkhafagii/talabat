import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSBadge } from '@/components/ios/IOSBadge';

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
            style={{ marginBottom: iosSpacing.xs }}
            onPress={() => onSelectOrder && onSelectOrder(o.id)}
            accessibilityRole="button"
          >
            <IOSCard padding="sm" style={onSelectOrder ? styles.cardAction : undefined}>
              <View style={styles.rowHeader}>
                <Text style={styles.title}>Order {o.id.slice(-6).toUpperCase()}</Text>
                <IOSBadge label="Issue" tone="error" />
              </View>
              <Text style={styles.meta}>Issue: {o.issue}</Text>
              <View style={styles.badgeRow}>
                {o.status && <IOSBadge label={`Status: ${o.status}`} tone="info" />}
                {o.payment_status && <IOSBadge label={`Payment: ${o.payment_status}`} tone="warning" />}
              </View>
              {o.restaurant_id && <Text style={styles.meta}>Restaurant: {o.restaurant_id}</Text>}
            </IOSCard>
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
            style={{ marginBottom: iosSpacing.xs }}
            onPress={() => onSelectDelivery && onSelectDelivery(d.order_id ?? d.id)}
            accessibilityRole="button"
          >
            <IOSCard padding="sm" style={onSelectDelivery ? styles.cardAction : undefined}>
              <View style={styles.rowHeader}>
                <Text style={styles.title}>Delivery {d.id.slice(-6).toUpperCase()}</Text>
                <IOSBadge label="Issue" tone="error" />
              </View>
              <Text style={styles.meta}>Issue: {d.issue}</Text>
              <View style={styles.badgeRow}>
                {d.status && <IOSBadge label={`Status: ${d.status}`} tone="info" />}
                {d.driver_id && <IOSBadge label={`Driver: ${d.driver_id.slice(0, 6)}`} tone="neutral" />}
              </View>
            </IOSCard>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { ...iosTypography.headline, marginBottom: iosSpacing.xs },
  helper: { ...iosTypography.caption, color: iosColors.secondaryText, marginBottom: iosSpacing.xs },
  cardAction: { borderColor: iosColors.primary },
  title: { ...iosTypography.subhead },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: iosSpacing.xs, marginTop: iosSpacing.xs },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
