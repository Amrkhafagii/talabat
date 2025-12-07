import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Bell, CalendarRange, ArrowUpRight, Clock3, Users, UtensilsCrossed, Wallet, Settings, BarChart3 } from 'lucide-react-native';

import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import PillTabs from '@/components/ui/PillTabs';
import BarChart, { BarDatum } from '@/components/ui/BarChart';
import AvatarRow from '@/components/ui/AvatarRow';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { ensureRestaurantForUser, getRestaurantDashboard, getTrustedArrivals } from '@/utils/database';
import { isRestaurantOpenNow, formatTodayHours } from '@/utils/hours';
import { Restaurant, RestaurantDashboard as RestaurantDashboardData, TrustedArrival } from '@/types/database';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type RangeKey = 'today' | '7d' | '30d';
type MetricKey = 'sales' | 'orders' | 'customers' | 'menu_items';

const rangeOptions: { key: RangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
];

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [dashboard, setDashboard] = useState<RestaurantDashboardData | null>(null);
  const [trustedArrivals, setTrustedArrivals] = useState<TrustedArrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [trustedLoading, setTrustedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('today');
  const [metric, setMetric] = useState<MetricKey>('sales');
  const [activeHourKey, setActiveHourKey] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { orders, refetch: refetchOrders } = useRealtimeOrders({
    restaurantId: restaurant?.id,
  });

  useEffect(() => {
    if (user) {
      loadRestaurant();
    }
  }, [user]);

  useEffect(() => {
    if (restaurant) {
      loadDashboard(range);
      loadArrivals();
    }
  }, [restaurant, range]);

  const loadRestaurant = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const rest = await ensureRestaurantForUser(user.id);
      if (!rest) {
        setError('No restaurant found for this user');
        return;
      }
      setRestaurant(rest);
    } catch (err) {
      console.error('Error loading restaurant data', err);
      setError('Failed to load restaurant data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (rangeKey: RangeKey) => {
    if (!restaurant) return;
    try {
      setMetricsLoading(true);
      const days = rangeOptions.find((r) => r.key === rangeKey)?.days ?? 1;
      const statsData = await getRestaurantDashboard(restaurant.id, days);
      setDashboard(statsData);
      if (statsData?.hourly?.length) {
        const top = statsData.hourly.reduce((prev, cur) => (cur.sales > prev.sales ? cur : prev), statsData.hourly[0]);
        setActiveHourKey(top.hour);
      }
    } catch (err) {
      console.error('Error loading stats', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const loadArrivals = async () => {
    if (!restaurant) return;
    try {
      setTrustedLoading(true);
      const arrivals = await getTrustedArrivals(restaurant.id, 7);
      setTrustedArrivals(arrivals);
    } catch (err) {
      console.error('Error loading trusted arrivals', err);
      setTrustedArrivals([]);
    } finally {
      setTrustedLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRestaurant(), refetchOrders()]);
    if (restaurant) {
      await Promise.all([loadDashboard(range), loadArrivals()]);
    }
    setRefreshing(false);
  };

  const isOpenNow = restaurant?.is_open && isRestaurantOpenNow(restaurant?.restaurant_hours);
  const todayHours = formatTodayHours(restaurant?.restaurant_hours);
  const newOrdersCount = orders.filter((order) => order.status === 'pending').length;

  const summary = dashboard?.summary;
  const metricCards = [
    { key: 'sales', title: "Today's Sales", value: summary?.sales ?? 0, delta: summary?.sales_pct_change },
    { key: 'orders', title: "Today's Orders", value: summary?.orders ?? 0, delta: summary?.orders_pct_change },
    { key: 'aov', title: 'Avg Order Value', value: summary?.aov ?? 0, delta: summary?.aov_pct_change },
    { key: 'customers', title: 'New Customers', value: summary?.customers ?? 0, delta: summary?.customers_pct_change },
  ] as const;

  const metricTabs = [
    { key: 'sales', label: 'Sales' },
    { key: 'orders', label: 'Orders' },
    { key: 'customers', label: 'Customers' },
    { key: 'menu_items', label: 'Menu Items' },
  ];

  const hourlyData: BarDatum[] = useMemo(() => {
    return (dashboard?.hourly || []).map((row) => {
      const hourLabel = formatHourLabel(row.hour);
      const value =
        metric === 'orders'
          ? row.orders
          : metric === 'customers'
          ? row.customers
          : row.sales;
      return { label: hourLabel, key: row.hour, value, active: activeHourKey === row.hour };
    });
  }, [dashboard?.hourly, metric, activeHourKey]);

  const activeBar = hourlyData.find((b) => b.key === activeHourKey) ?? hourlyData[0];

  const styles = useMemo(() => createStyles(theme), [theme]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Restaurant not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRestaurant}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
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
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{restaurant.name?.[0] || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: isOpenNow ? theme.colors.status.success : theme.colors.status.error }]} />
                <Text style={styles.statusText}>
                  {isOpenNow ? 'Open' : 'Closed'}
                  {todayHours ? ` • ${todayHours}` : ''}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.heroRight}>
            <RealtimeIndicator />
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/restaurant/orders')}>
              <Bell size={20} color={theme.colors.secondaryText} />
              {newOrdersCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>{newOrdersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          {metricCards.map((card) => (
            <StatTile
              key={card.key}
              title={card.title}
              value={card.key === 'sales' ? formatMoney(card.value) : formatNumber(card.value)}
              delta={card.delta}
            />
          ))}
        </View>

        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickActionCard}
              onPress={action.onPress}
              activeOpacity={0.85}
              hitSlop={theme.tap.hitSlop}
            >
              <View style={[styles.iconPill, { backgroundColor: action.tint }]}>
                <action.icon size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
              <ArrowUpRight size={16} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Daily Performance</Text>
              <Text style={styles.sectionSubtitle}>Live metrics & hourly trends</Text>
            </View>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} hitSlop={theme.tap.hitSlop} style={styles.dateButton}>
              <CalendarRange size={18} color={theme.colors.text} />
              <Text style={styles.dateButtonText}>{rangeOptions.find((r) => r.key === range)?.label ?? 'Today'}</Text>
            </TouchableOpacity>
          </View>
          <PillTabs
            tabs={rangeOptions.map((r) => ({ key: r.key, label: r.label }))}
            activeKey={range}
            onChange={(key) => setRange(key as RangeKey)}
            scrollable={false}
            style={{ marginBottom: theme.spacing.md }}
          />
          <View style={styles.kpiGrid}>
            {metricCards.map((card) => (
              <KpiCard
                key={card.key}
                title={card.title}
                value={card.key === 'sales' || card.key === 'aov' ? formatMoney(card.value) : formatNumber(card.value)}
                delta={card.delta}
              />
            ))}
          </View>
          <PillTabs
            tabs={metricTabs}
            activeKey={metric}
            onChange={(key) => setMetric(key as MetricKey)}
            scrollable
            style={{ marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.xs }}
          />
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>
                  {metric === 'sales' ? 'Hourly Sales' : metric === 'orders' ? 'Hourly Orders' : metric === 'customers' ? 'Hourly Customers' : 'Menu Items'}
                </Text>
                {activeBar ? (
                  <Text style={styles.chartSubtitle}>
                    {activeBar.label} • {metric === 'sales' ? formatMoney(activeBar.value) : formatNumber(activeBar.value)}
                  </Text>
                ) : null}
              </View>
              {metricsLoading && <ActivityIndicator size="small" color={theme.colors.accent} />}
            </View>
            {metric === 'menu_items' ? (
              <Text style={styles.infoText}>Menu item hourly breakdown not available yet.</Text>
            ) : (
              <BarChart
                data={hourlyData}
                loading={metricsLoading}
                emptyLabel="No hourly data"
                selectedKey={activeHourKey || undefined}
                onSelect={(bar) => setActiveHourKey(bar.key || bar.label)}
              />
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Trusted Arrivals (7 days)</Text>
              <Text style={styles.sectionSubtitle}>Repeat customers that visit most</Text>
            </View>
          </View>
          {trustedLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading customers...</Text>
            </View>
          ) : trustedArrivals.length === 0 ? (
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
        </View>
      </ScrollView>

      <Modal transparent visible={showDatePicker} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select range</Text>
            {rangeOptions.map((opt) => {
              const active = opt.key === range;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.modalOption, active && styles.modalOptionActive]}
                  onPress={() => {
                    setRange(opt.key);
                    setShowDatePicker(false);
                  }}
                  hitSlop={theme.tap.hitSlop}
                >
                  <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowDatePicker(false)} hitSlop={theme.tap.hitSlop}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const quickActions = [
  {
    key: 'orders',
    label: 'Manage Orders',
    icon: Clock3,
    tint: '#FF7A1A',
    onPress: () => router.push('/(tabs)/restaurant/orders'),
  },
  {
    key: 'menu',
    label: 'Edit Menu',
    icon: UtensilsCrossed,
    tint: '#3B82F6',
    onPress: () => router.push('/(tabs)/restaurant/menu'),
  },
  {
    key: 'wallet',
    label: 'Wallet & Payouts',
    icon: Wallet,
    tint: '#22C55E',
    onPress: () => router.push('/(tabs)/restaurant/wallet'),
  },
  {
    key: 'performance',
    label: 'Performance',
    icon: BarChart3,
    tint: '#8B5CF6',
    onPress: () => router.push('/(tabs)/restaurant/performance'),
  },
  {
    key: 'settings',
    label: 'Operational Settings',
    icon: Settings,
    tint: '#F59E0B',
    onPress: () => router.push('/(tabs)/restaurant/settings'),
  },
] as const;

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US');
}

function formatDelta(value?: number | null) {
  if (value === null || value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
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
  const isCompact = theme.device.isSmallScreen;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing.sm,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    errorText: {
      ...theme.typography.body,
      color: theme.colors.status.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
    },
    retryButtonText: {
      ...theme.typography.button,
      color: '#FFFFFF',
    },
    hero: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    heroLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
    heroRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatarText: { ...theme.typography.title1 },
    restaurantName: { ...theme.typography.title1 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: 4, flexWrap: 'wrap' },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusText: { ...theme.typography.subhead, color: theme.colors.secondaryText },
    iconButton: { position: 'relative', padding: theme.spacing.xs },
    notificationBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      backgroundColor: theme.colors.accent,
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    notificationCount: { ...theme.typography.caption, color: '#FFFFFF', fontFamily: 'Inter-Bold' },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    quickActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      width: isCompact ? '100%' : '48%',
    },
    iconPill: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionLabel: { ...theme.typography.subhead, color: theme.colors.text, flex: 1, marginLeft: theme.spacing.sm },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
    sectionTitle: { ...theme.typography.title2 },
    sectionSubtitle: { ...theme.typography.caption, color: theme.colors.secondaryText },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    chartCard: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
    chartTitle: { ...theme.typography.subhead },
    chartSubtitle: { ...theme.typography.caption, color: theme.colors.secondaryText },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    emptyState: { alignItems: 'center', paddingVertical: theme.spacing.lg },
    emptyTitle: { ...theme.typography.subhead },
    emptyText: { ...theme.typography.caption, color: theme.colors.secondaryText, textAlign: 'center', marginTop: theme.spacing.xs },
    arrivalMeta: { ...theme.typography.caption, color: theme.colors.secondaryText },
    infoText: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: theme.spacing.sm },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceAlt,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    dateButtonText: { ...theme.typography.caption, color: theme.colors.text },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      width: '100%',
      maxWidth: 360,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalTitle: { ...theme.typography.title2, marginBottom: theme.spacing.md },
    modalOption: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
    },
    modalOptionActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent + '22' },
    modalOptionText: { ...theme.typography.body },
    modalOptionTextActive: { color: theme.colors.accent, fontFamily: 'Inter-SemiBold' },
    modalClose: {
      marginTop: theme.spacing.sm,
      alignSelf: 'flex-end',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    modalCloseText: { ...theme.typography.button, color: theme.colors.accent },
  });
}

function StatTile({ title, value, delta }: { title: string; value: string; delta: number | null | undefined }) {
  const theme = useRestaurantTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexBasis: theme.device.isSmallScreen ? '100%' : '48%',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.card,
        },
        title: { ...theme.typography.caption, color: theme.colors.secondaryText, marginBottom: 6 },
        value: { ...theme.typography.title1 },
        delta: { ...theme.typography.caption, color: (delta || 0) >= 0 ? theme.colors.status.success : theme.colors.status.error, marginTop: 4 },
      }),
    [theme, delta]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.delta}>{formatDelta(delta)}</Text>
    </View>
  );
}

function KpiCard({ title, value, delta }: { title: string; value: string; delta: number | null | undefined }) {
  const theme = useRestaurantTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexBasis: theme.device.isSmallScreen ? '100%' : '48%',
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.borderMuted,
        },
        title: { ...theme.typography.caption, color: theme.colors.secondaryText, marginBottom: 4 },
        value: { ...theme.typography.title2 },
        delta: { ...theme.typography.caption, color: (delta || 0) >= 0 ? theme.colors.status.success : theme.colors.status.error, marginTop: 2 },
      }),
    [theme, delta]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.delta}>{formatDelta(delta)}</Text>
    </View>
  );
}
