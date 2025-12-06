import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gateLoading || !allowed) return null;

  return (
    <AdminShell title="Analytics" onSignOut={signOut}>
      <AdminGrid minColumnWidth={340}>
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
        <AdminState loading={loading} emptyMessage="No analytics yet.">
          <AnalyticsCharts
            totalsCustomer={totals?.total_customer_paid || 0}
            totalsPlatform={totals?.total_platform_fee || 0}
            paidOrders={totals?.paid_orders || 0}
            drivers={drivers}
            restaurants={restaurants}
          />
        </AdminState>
      </AdminGrid>
      <View style={{ marginTop: styles.metaRow.fontSize ? 12 : 12 }}>
        <AdminState loading={loading} emptyMessage="No additional analytics.">
          {/* Placeholder for future charts/tables such as trend lines or cohort analysis */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Trends</Text>
                <Text style={styles.metaRow}>Add line/bar charts here (spark placeholders).</Text>
              </View>
            </View>
            <View style={{ height: 120, backgroundColor: '#F3F4F6', borderRadius: 10 }} />
          </View>
        </AdminState>
      </View>
    </AdminShell>
  );
}
