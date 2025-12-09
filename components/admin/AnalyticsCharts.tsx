import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { money } from '@/utils/adminUi';
import { IOSCard } from '@/components/ios/IOSCard';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import type { DriverProfit, RestaurantProfit } from '@/utils/db/admin';

type Props = {
  totalsCustomer: number;
  totalsPlatform: number;
  paidOrders: number;
  drivers: DriverProfit[];
  restaurants: RestaurantProfit[];
};

export function AnalyticsCharts({ totalsCustomer, totalsPlatform, paidOrders, drivers, restaurants }: Props) {
  return (
    <View>
      <View style={chartStyles.metricRow}>
        <KpiCard label="Total Customer Paid" value={money(totalsCustomer)} delta="+12%" />
        <KpiCard label="Platform Fee" value={money(totalsPlatform)} delta="+8%" />
        <KpiCard label="Paid Orders" value={`${paidOrders}`} delta="+10%" />
      </View>

      <IOSCard padding="md" style={chartStyles.card}>
        <Text style={chartStyles.sectionTitle}>Profit Breakdown by Driver</Text>
        <Text style={chartStyles.helper}>Top Drivers</Text>
        <BarList
          items={drivers.slice(0, 5).map(d => ({ label: d.full_name || d.driver_id, value: d.net_driver_profit }))}
        />
      </IOSCard>

      <IOSCard padding="md" style={chartStyles.card}>
        <Text style={chartStyles.sectionTitle}>Profit Breakdown by Restaurant</Text>
        <BarList
          items={restaurants.slice(0, 5).map(r => ({ label: r.restaurant_name || r.restaurant_id, value: r.net_restaurant_profit }))}
          iconMode
        />
      </IOSCard>
    </View>
  );
}

function KpiCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <IOSCard padding="md" style={chartStyles.kpiCard} elevated>
      <Text style={chartStyles.kpiLabel}>{label}</Text>
      <Text style={chartStyles.kpiValue}>{value}</Text>
      <Text style={chartStyles.kpiDelta}>{delta}</Text>
    </IOSCard>
  );
}

function BarList({ items, iconMode = false }: { items: { label: string; value: number }[]; iconMode?: boolean }) {
  if (!items.length) return <Text style={chartStyles.helper}>No data.</Text>;
  const max = items[0]?.value || 1;
  return (
    <View style={{ gap: iosSpacing.sm }}>
      {items.map(item => {
        const pct = Math.max(5, Math.min(100, (item.value / max) * 100));
        return (
          <View key={item.label} style={{ gap: iosSpacing.xxs }}>
            <View style={chartStyles.barRow}>
              <Text style={chartStyles.barLabel}>{iconMode ? `🍔 ${item.label}` : item.label}</Text>
              <Text style={chartStyles.barValue}>{money(item.value)}</Text>
            </View>
            <View style={chartStyles.barBg}>
              <View style={[chartStyles.barFill, { width: `${pct}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default AnalyticsCharts;

const chartStyles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: iosSpacing.sm,
    marginBottom: iosSpacing.md,
  },
  kpiCard: { flex: 1, minWidth: 180, borderRadius: iosRadius.lg, backgroundColor: iosColors.surface },
  kpiLabel: { ...iosTypography.subhead, color: iosColors.secondaryText },
  kpiValue: { ...iosTypography.title2, marginTop: iosSpacing.xs },
  kpiDelta: { ...iosTypography.caption, color: iosColors.success, marginTop: iosSpacing.xs },
  card: { marginBottom: iosSpacing.md, borderRadius: iosRadius.xl },
  sectionTitle: { ...iosTypography.headline, marginBottom: iosSpacing.xs },
  helper: { ...iosTypography.caption, color: iosColors.secondaryText, marginBottom: iosSpacing.sm },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { ...iosTypography.body },
  barValue: { ...iosTypography.caption, color: iosColors.secondaryText },
  barBg: { backgroundColor: iosColors.surfaceAlt, borderRadius: iosRadius.bar, height: 12 },
  barFill: { height: 12, borderRadius: iosRadius.bar, backgroundColor: iosColors.primary },
});
