import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import ScreenHeader from '@/components/ui/ScreenHeader';
import BarChart, { BarDatum } from '@/components/ui/BarChart';
import AvatarRow from '@/components/ui/AvatarRow';
import { BlockSkeleton, ListSkeleton } from '@/components/restaurant/Skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { ensureRestaurantForUser, getRestaurantDashboard, getTrustedArrivals } from '@/utils/database';
import { Restaurant, RestaurantDashboard as RestaurantDashboardData, TrustedArrival } from '@/types/database';
import { wp, hp } from '@/styles/responsive';

type RangeKey = 'today' | '7d' | '30d';

export default function DailyPerformanceScreen() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [dashboard, setDashboard] = useState<RestaurantDashboardData | null>(null);
  const [trustedArrivals, setTrustedArrivals] = useState<TrustedArrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range] = useState<RangeKey>('today');
  const [activeHourKey, setActiveHourKey] = useState<string | null>(null);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const rest = await ensureRestaurantForUser(user.id);
      setRestaurant(rest);
      if (rest) {
        await Promise.all([loadDashboard(rest.id, range), loadArrivals(rest.id)]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (restaurantId: string, rangeKey: RangeKey) => {
    const statsData = await getRestaurantDashboard(restaurantId, rangeKey === '7d' ? 7 : rangeKey === '30d' ? 30 : 1);
    setDashboard(statsData);
    if (statsData?.hourly?.length) {
      const top = statsData.hourly.reduce((prev, cur) => (cur.sales > prev.sales ? cur : prev), statsData.hourly[0]);
      setActiveHourKey(top.hour);
    }
  };

  const loadArrivals = async (restaurantId: string) => {
    const arrivals = await getTrustedArrivals(restaurantId, 7);
    setTrustedArrivals(arrivals);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const summary = dashboard?.summary;
  const metricCards = [
    { key: 'sales', title: 'Gross Sales', value: summary?.sales ?? 0 },
    { key: 'orders', title: 'Total Orders', value: summary?.orders ?? 0 },
    { key: 'aov', title: 'Avg. Order Value', value: summary?.aov ?? 0 },
  ] as const;

  const hourlyData: BarDatum[] = useMemo(() => {
    return (dashboard?.hourly || []).map((row) => {
      const hourLabel = formatHourLabel(row.hour);
      return { label: hourLabel, key: row.hour, value: row.sales, active: activeHourKey === row.hour };
    });
  }, [dashboard?.hourly, activeHourKey]);

  const activeBar = hourlyData.find((b) => b.key === activeHourKey) ?? hourlyData[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor={theme.colors.background} />
        <ScreenHeader title="Daily Performance" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <BlockSkeleton width="60%" height={22} />
          <BlockSkeleton width="48%" height={16} style={{ marginTop: theme.spacing.sm }} />
          <ListSkeleton rows={2} inset={theme.spacing.lg} lineHeight={12} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <ScreenHeader title="Daily Performance" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        contentContainerStyle={{ paddingBottom: theme.insets.bottom + theme.spacing.xl }}
      >
        <View style={styles.metricGrid}>
          {metricCards.map((card) => (
            <View key={card.key} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{card.title}</Text>
              <Text style={styles.metricValue}>
                {card.key === 'orders' ? formatNumber(card.value) : formatMoney(card.value)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Hourly Sales</Text>
              {activeBar ? (
                <Text style={styles.chartSubtitle}>
                  {activeBar.label} • {formatMoney(activeBar.value)}
                </Text>
              ) : null}
            </View>
          </View>
          <BarChart
            data={hourlyData}
            loading={false}
            emptyLabel="No hourly data"
            selectedKey={activeHourKey || undefined}
            onSelect={(bar) => setActiveHourKey(bar.key || bar.label)}
          />
        </View>

        <Text style={styles.sectionTitle}>Trusted Arrivals</Text>
        {trustedArrivals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No repeat visits yet</Text>
            <Text style={styles.emptyText}>Once customers return, they will appear here.</Text>
          </View>
        ) : (
          trustedArrivals.map((arrival) => (
            <AvatarRow
              key={arrival.customer_id}
              name={arrival.full_name || 'Customer'}
              subtitle={`${arrival.visits} visit${arrival.visits === 1 ? '' : 's'}`}
              avatarUrl={arrival.avatar_url}
              rightContent={<Text style={styles.arrivalMeta}>{arrival.last_visit ? formatLastVisit(arrival.last_visit) : 'Recent'}</Text>}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US');
}

function formatHourLabel(hour: string) {
  const [h] = hour.split(':');
  const num = Number(h);
  if (Number.isNaN(num)) return hour;
  const suffix = num >= 12 ? 'p' : 'a';
  const value = num % 12 === 0 ? 12 : num % 12;
  return `${value}${suffix}`;
}

function formatLastVisit(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString();
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const horizontal = Math.max(theme.spacing.md, wp('5%'));
  const vertical = Math.max(theme.spacing.md, hp('2.5%'));
  const cardMin = wp('44%');
  const cardMax = wp('92%');
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background, writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: horizontal },
    loadingText: { ...theme.typography.body, color: theme.colors.secondaryText, marginTop: theme.spacing.sm },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: horizontal,
      paddingTop: vertical,
    },
    metricCard: {
      flexBasis: wp('48%'),
      minWidth: cardMin,
      maxWidth: cardMax,
      flexGrow: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    metricLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    metricValue: { ...theme.typography.title1, marginTop: 4 },
    chartCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: horizontal,
      marginTop: vertical,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
    chartTitle: { ...theme.typography.subhead },
    chartSubtitle: { ...theme.typography.caption, color: theme.colors.secondaryText },
    sectionTitle: { ...theme.typography.subhead, marginHorizontal: horizontal, marginTop: vertical, marginBottom: theme.spacing.sm },
    emptyState: { alignItems: 'center', paddingVertical: vertical, paddingHorizontal: horizontal },
    emptyTitle: { ...theme.typography.subhead },
    emptyText: { ...theme.typography.caption, color: theme.colors.secondaryText, textAlign: 'center', marginTop: theme.spacing.xs },
    arrivalMeta: { ...theme.typography.caption, color: theme.colors.secondaryText },
  });
}
