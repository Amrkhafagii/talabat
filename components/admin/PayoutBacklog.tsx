import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import type { DriverPayable, RestaurantPayable } from '@/utils/db/adminOps';

type Props = {
  restaurantPayables: RestaurantPayable[];
  driverPayables: DriverPayable[];
  loading?: boolean;
};

export function PayoutBacklog({ restaurantPayables, driverPayables, loading = false }: Props) {
  if (loading) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payout backlog</Text>
        <Text style={styles.metaRow}>Loading payouts…</Text>
      </View>
    );
  }

  const restSample = restaurantPayables.slice(0, 3);
  const driverSample = driverPayables.slice(0, 3);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.sectionTitle}>Payout backlog</Text>
        <Text style={styles.metaRow}>
          Restaurants: {restaurantPayables.length} • Drivers: {driverPayables.length}
        </Text>
      </View>
      <Text style={styles.metaRow}>Top items (most recent)</Text>
      {restSample.map(p => (
        <View key={p.order_id} style={styles.card}>
          <Text style={styles.title}>{p.restaurant_name || p.restaurant_id}</Text>
          <Text style={styles.metaRow}>Order: {p.order_id}</Text>
          <Text style={styles.row}>
            Amount due: ${(Number(p.restaurant_net ?? 0) + Number(p.tip_amount ?? 0)).toFixed(2)}
          </Text>
          {p.restaurant_payout_last_error && (
            <Text style={[styles.row, styles.warningText]}>Last error: {p.restaurant_payout_last_error}</Text>
          )}
        </View>
      ))}
      {driverSample.map(p => (
        <View key={p.order_id} style={styles.card}>
          <Text style={styles.title}>{p.driver_name || p.driver_id}</Text>
          <Text style={styles.metaRow}>Order: {p.order_id}</Text>
          <Text style={styles.row}>Amount due: ${Number(p.driver_payable ?? 0).toFixed(2)}</Text>
          {p.driver_payout_last_error && (
            <Text style={[styles.row, styles.warningText]}>Last error: {p.driver_payout_last_error}</Text>
          )}
        </View>
      ))}
      {restSample.length === 0 && driverSample.length === 0 && (
        <Text style={styles.row}>No payouts pending.</Text>
      )}
    </View>
  );
}

export default PayoutBacklog;
