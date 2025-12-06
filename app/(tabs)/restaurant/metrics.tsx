import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { ensureRestaurantForUser, getRestaurantStats, getTrustedArrivalMetrics } from '@/utils/database';
import { Restaurant, RestaurantStats } from '@/types/database';
import { TrustedArrivalMetrics } from '@/utils/db/metrics';
import Card from '@/components/ui/Card';

export default function RestaurantMetrics() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [taMetrics, setTaMetrics] = useState<TrustedArrivalMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const rest = await ensureRestaurantForUser(user.id);
      setRestaurant(rest);
      if (rest) {
        const [s, ta] = await Promise.all([
          getRestaurantStats(rest.id),
          getTrustedArrivalMetrics(7, rest.id),
        ]);
        setStats(s);
        setTaMetrics(ta || []);
      }
    } catch (err) {
      console.error('Error loading metrics', err);
      setError('Failed to load metrics. Pull to refresh to retry.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading metrics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Performance Overview</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <View style={styles.grid}>
          <StatCard label="Today Revenue" value={`$${(stats?.todayRevenue || 0).toFixed(2)}`} />
          <StatCard label="Today Orders" value={`${stats?.todayOrders || 0}`} />
          <StatCard label="Avg Order Value" value={`$${(stats?.avgOrderValue || 0).toFixed(2)}`} />
          <StatCard label="Rating" value={`${(stats?.rating || 0).toFixed(1)}`} />
        </View>

        <Text style={styles.heading}>Trusted Arrival (last 7 days)</Text>
        <Card style={styles.card}>
          {taMetrics.length === 0 ? (
            <Text style={styles.empty}>No metrics available yet.</Text>
          ) : (
            taMetrics.slice(0, 7).map((m) => (
              <View key={m.metric_date} style={styles.metricRow}>
                <View>
                  <Text style={styles.metricDate}>{m.metric_date}</Text>
                  <Text style={styles.metricSub}>Orders affected: {m.affected_orders ?? 0}</Text>
                </View>
                <View style={styles.metricValues}>
                  <MetricPill label="On-time" value={m.on_time_pct} suffix="%" />
                  <MetricPill label="Reroute" value={m.reroute_rate} suffix="%" />
                  <MetricPill label="Sub acceptance" value={m.substitution_acceptance} suffix="%" />
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.statCard as any}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Card>
  );
}

function MetricPill({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  const display = value === null || value === undefined ? '—' : `${value}${suffix ?? ''}`;
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricPillLabel}>{label}</Text>
      <Text style={styles.metricPillValue}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, gap: 16 },
  heading: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#111827' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', padding: 12 },
  statLabel: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12 },
  statValue: { fontFamily: 'Inter-Bold', color: '#111827', fontSize: 20, marginTop: 4 },
  card: { padding: 12 },
  empty: { fontFamily: 'Inter-Regular', color: '#6B7280' },
  errorText: { fontFamily: 'Inter-Regular', color: '#EF4444' },
  metricRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricDate: { fontFamily: 'Inter-SemiBold', color: '#111827' },
  metricSub: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12 },
  metricValues: { flexDirection: 'row', gap: 8 },
  metricPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricPillLabel: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12 },
  metricPillValue: { fontFamily: 'Inter-SemiBold', color: '#111827', fontSize: 14 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, fontFamily: 'Inter-Regular', color: '#6B7280' },
});
