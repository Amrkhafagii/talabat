import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import { money } from '@/utils/adminUi';
import type { DriverProfit, RestaurantProfit } from '@/utils/db/adminOps';

type Props = {
  totalsCustomer: number;
  totalsPlatform: number;
  paidOrders: number;
  drivers: DriverProfit[];
  restaurants: RestaurantProfit[];
};

export function AnalyticsCharts({ totalsCustomer, totalsPlatform, paidOrders, drivers, restaurants }: Props) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.feeGrid}>
        <View style={styles.feeCell}>
          <Text style={styles.feeLabel}>Customer paid</Text>
          <Text style={styles.feeValue}>${money(totalsCustomer)}</Text>
        </View>
        <View style={styles.feeCell}>
          <Text style={styles.feeLabel}>Platform fee</Text>
          <Text style={styles.feeValue}>${money(totalsPlatform)}</Text>
        </View>
        <View style={styles.feeCell}>
          <Text style={styles.feeLabel}>Paid orders</Text>
          <Text style={styles.feeValue}>{paidOrders}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Top drivers (net profit)</Text>
      <BarList
        items={drivers.slice(0, 5).map(d => ({ label: d.full_name || d.driver_id, value: d.net_driver_profit }))}
      />

      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Top restaurants (net profit)</Text>
      <BarList
        items={restaurants.slice(0, 5).map(r => ({ label: r.restaurant_name || r.restaurant_id, value: r.net_restaurant_profit }))}
      />
    </View>
  );
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  if (!items.length) return <Text style={styles.helperText}>No data.</Text>;
  const max = items[0]?.value || 1;
  return (
    <View style={{ gap: 8 }}>
      {items.map(item => {
        const pct = Math.max(5, Math.min(100, (item.value / max) * 100));
        return (
          <View key={item.label}>
            <Text style={styles.row}>{item.label}</Text>
            <View style={{ backgroundColor: '#E5E7EB', borderRadius: 6, height: 10 }}>
              <View style={{ width: `${pct}%`, height: 10, borderRadius: 6, backgroundColor: '#111827' }} />
            </View>
            <Text style={styles.metaRow}>${money(item.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default AnalyticsCharts;
