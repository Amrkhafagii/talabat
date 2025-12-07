import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminState } from '@/components/admin/AdminState';
import { useAdminGate } from '@/hooks/useAdminGate';
import {
  getAdminTotals,
  getDriverProfit,
  getRestaurantProfit,
  AdminTotals,
  DriverProfit,
  RestaurantProfit,
} from '@/utils/db/adminOps';
import AdminGrid from '@/components/admin/AdminGrid';
import AnalyticsFilters from '@/components/admin/AnalyticsFilters';
import AnalyticsCharts from '@/components/admin/AnalyticsCharts';
import { styles } from '@/styles/adminMetrics';
import { IOSCard } from '@/components/ios/IOSCard';
import { iosColors, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSChartPlaceholder } from '@/components/ios/IOSChartPlaceholder';

export default function AdminAnalytics() {
  const { allowed, loading: gateLoading, signOut } = useAdminGate();
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<AdminTotals | null>(null);
  const [drivers, setDrivers] = useState<DriverProfit[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantProfit[]>([]);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [driverFilter, setDriverFilter] = useState<string>('');
  const [restaurantFilter, setRestaurantFilter] = useState<string>('');
  const defaultStart = useMemo(() => formatDateOffset(-30), []);
  const defaultEnd = useMemo(() => formatDateOffset(0), []);

  const load = async () => {
    setLoading(true);
    const [t, d, r] = await Promise.all([
      getAdminTotals({ start, end }),
      getDriverProfit({ start, end, driverUserId: driverFilter || null }),
      getRestaurantProfit({ start, end, restaurantId: restaurantFilter || null }),
    ]);
    setTotals(t);
    setDrivers(d);
    setRestaurants(r);
    setLoading(false);
  };

  useEffect(() => {
    if (!start) setStart(defaultStart);
    if (!end) setEnd(defaultEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (start && end) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  if (gateLoading || !allowed) return null;

  return (
    <AdminShell
      title="Analytics"
      onSignOut={signOut}
      headerVariant="ios"
      headerTrailingAction={{ label: 'Filter', onPress: load }}
    >
      <IOSCard padding="md" style={analytics.card}>
        <View style={analytics.headerRow}>
          <Text style={analytics.title}>Analytics Dashboard</Text>
          <Text style={analytics.link} onPress={load}>Filter</Text>
        </View>
        <AnalyticsFilters
          start={start}
          end={end}
          driverFilter={driverFilter}
          restaurantFilter={restaurantFilter}
          onChangeStart={setStart}
          onChangeEnd={setEnd}
          onChangeDriver={setDriverFilter}
          onChangeRestaurant={setRestaurantFilter}
          onApply={load}
        />
      </IOSCard>

      <AdminGrid minColumnWidth={300}>
        <IOSCard padding="md" style={analytics.card}>
          <AdminState loading={loading} emptyMessage="No analytics yet.">
            <AnalyticsCharts
              totalsCustomer={totals?.total_customer_paid || 0}
              totalsPlatform={totals?.total_platform_fee || 0}
              paidOrders={totals?.paid_orders || 0}
              drivers={drivers}
              restaurants={restaurants}
            />
          </AdminState>
        </IOSCard>
        <IOSCard padding="md" style={analytics.card}>
          <AdminState loading={loading} emptyMessage="No additional analytics.">
            <View>
              <Text style={analytics.sectionTitle}>Trends</Text>
              <Text style={analytics.helper}>Future trends chart placeholder.</Text>
              <IOSChartPlaceholder />
            </View>
          </AdminState>
        </IOSCard>
      </AdminGrid>
    </AdminShell>
  );
}

const analytics = StyleSheet.create({
  card: { marginBottom: iosSpacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: iosSpacing.sm },
  title: { ...iosTypography.headline },
  link: { ...iosTypography.subhead, color: iosColors.primary },
  sectionTitle: { ...iosTypography.headline, marginBottom: iosSpacing.xs },
  helper: { ...iosTypography.caption, marginBottom: iosSpacing.sm },
});

function formatDateOffset(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
