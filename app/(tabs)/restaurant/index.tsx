import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { BlockSkeleton, ListSkeleton } from '@/components/restaurant/Skeletons';
import { ensureRestaurantForUser, getRestaurantDashboard } from '@/utils/database';
import { isRestaurantOpenNow, formatTodayHours } from '@/utils/hours';
import { Restaurant, RestaurantDashboard as RestaurantDashboardData } from '@/types/database';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { wp, hp } from '@/styles/responsive';
import { Icon, type IconName } from '@/components/ui/Icon';

type RangeKey = 'today' | '7d' | '30d';

export default function RestaurantDashboard() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [dashboard, setDashboard] = useState<RestaurantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range] = useState<RangeKey>('today');

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
      const statsData = await getRestaurantDashboard(restaurant.id, rangeKey === '7d' ? 7 : rangeKey === '30d' ? 30 : 1);
      setDashboard(statsData);
    } catch (err) {
      console.error('Error loading stats', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRestaurant(), refetchOrders()]);
    if (restaurant) {
      await loadDashboard(range);
    }
    setRefreshing(false);
  };

  const isOpenNow = restaurant?.is_open && isRestaurantOpenNow(restaurant?.restaurant_hours);
  const todayHours = formatTodayHours(restaurant?.restaurant_hours);
  const newOrdersCount = orders.filter((order) => order.status === 'pending').length;

  const summary = dashboard?.summary;
  const metricCards = [
    { key: 'sales', title: "Today's Sales", value: summary?.sales ?? 0 },
    { key: 'orders', title: 'Orders', value: summary?.orders ?? 0 },
    { key: 'aov', title: 'Avg. Order Value', value: summary?.aov ?? 0 },
    { key: 'customers', title: 'New Customers', value: summary?.customers ?? 0 },
  ] as const;

  const quickActions = useMemo(() => buildQuickActions(theme), [theme]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <BlockSkeleton width="52%" height={26} />
          <BlockSkeleton width="36%" height={16} style={{ marginTop: theme.spacing.sm }} />
          <ListSkeleton rows={2} inset={theme.spacing.lg} />
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
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
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
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{restaurant.name?.[0] || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: isOpenNow ? theme.colors.status.success : theme.colors.status.error }]} />
                <Text style={styles.statusText}>{isOpenNow ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.alertButton} onPress={() => router.push('/(tabs)/restaurant/orders')}>
            <Icon name="Bell" size={theme.iconSizes.md} color={theme.colors.text} />
            {newOrdersCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>{newOrdersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {metricCards.map((card) => (
            <View key={card.key} style={styles.statCard}>
              <Text style={styles.statLabel}>{card.title}</Text>
              <Text style={styles.statValue}>{card.key === 'sales' ? formatMoney(card.value) : formatNumber(card.value)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickActionCard}
              onPress={action.onPress}
              activeOpacity={0.9}
              hitSlop={theme.tap.hitSlop}
            >
              <View style={[styles.iconPill, { backgroundColor: action.tint }]}>
                <Icon name={action.iconName} size={theme.iconSizes.sm} color={action.iconColor} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
              <Icon name="ArrowUpRight" size={theme.iconSizes.sm} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionHeading}>Recent Orders</Text>
        <View style={styles.recentList}>
          {(orders.slice(0, 4) || []).map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderRow}
              onPress={() => router.push({ pathname: '/(tabs)/restaurant/order-detail/[orderId]', params: { orderId: order.id } } as any)}
              activeOpacity={0.9}
            >
              <View style={styles.orderIcon}>
                <Icon name="Receipt" size={theme.iconSizes.sm} color={theme.colors.secondaryText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderTitle}>Order #{order.short_code || order.order_number || order.id.slice(-4)}</Text>
                <Text style={styles.orderSubtitle}>{order.user?.full_name || 'Customer'}</Text>
              </View>
              <Text style={styles.orderAmount}>{formatMoney(order.total)}</Text>
            </TouchableOpacity>
          ))}
          {orders.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No recent orders</Text>
              <Text style={styles.emptyText}>New orders will appear here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type QuickAction = {
  key: string;
  label: string;
  iconName: IconName;
  tint: string;
  iconColor: string;
  onPress: () => void;
};

function buildQuickActions(theme: ReturnType<typeof useRestaurantTheme>): QuickAction[] {
  return [
    {
      key: 'orders',
      label: 'Manage Orders',
      iconName: 'Clock3',
      tint: theme.colors.primary[100],
      iconColor: theme.colors.primary[600],
      onPress: () => router.push('/(tabs)/restaurant/orders'),
    },
    {
      key: 'menu',
      label: 'Edit Menu',
      iconName: 'UtensilsCrossed',
      tint: theme.colors.statusSoft.info,
      iconColor: theme.colors.status.info,
      onPress: () => router.push('/(tabs)/restaurant/menu'),
    },
    {
      key: 'wallet',
      label: 'Wallet & Payouts',
      iconName: 'Wallet',
      tint: theme.colors.statusSoft.success,
      iconColor: theme.colors.status.success,
      onPress: () => router.push('/(tabs)/restaurant/wallet'),
    },
    {
      key: 'performance',
      label: 'Performance',
      iconName: 'BarChart3',
      tint: theme.colors.statusSoft.info,
      iconColor: theme.colors.status.info,
      onPress: () => router.push('/(tabs)/restaurant/performance'),
    },
    {
      key: 'settings',
      label: 'Operational Settings',
      iconName: 'Settings',
      tint: theme.colors.statusSoft.warning,
      iconColor: theme.colors.status.warning,
      onPress: () => router.push('/(tabs)/restaurant/settings'),
    },
  ];
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US');
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const gutter = Math.max(theme.spacing.md, wp('5%'));
  const wideGutter = Math.max(theme.spacing.lg, wp('6%'));
  const vertical = Math.max(theme.spacing.lg, hp('2.5%'));
  const cardMin = wp('44%');
  const cardMax = wp('92%');
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
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
      color: theme.colors.textInverse,
    },
    hero: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: wideGutter,
      paddingVertical: vertical,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    heroLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
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
    alertButton: {
      position: 'relative',
      padding: theme.spacing.xs,
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceAlt,
    },
    notificationBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      backgroundColor: theme.colors.accent,
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    notificationCount: { ...theme.typography.caption, color: theme.colors.textInverse, fontFamily: 'Inter-Bold' },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: wideGutter,
      paddingVertical: vertical,
    },
    statCard: {
      flexBasis: wp('48%'),
      minWidth: cardMin,
      maxWidth: cardMax,
      flexGrow: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    statLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    statValue: { ...theme.typography.title1, marginTop: 4 },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: wideGutter,
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
      flexBasis: wp('48%'),
      minWidth: cardMin,
      maxWidth: cardMax,
      flexGrow: 1,
    },
    iconPill: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionLabel: { ...theme.typography.subhead, color: theme.colors.text, flex: 1, marginLeft: theme.spacing.sm },
    sectionHeading: { ...theme.typography.subhead, marginHorizontal: gutter, marginBottom: theme.spacing.sm },
    recentList: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: gutter,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    orderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderMuted,
    },
    orderIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    orderTitle: { ...theme.typography.subhead },
    orderSubtitle: { ...theme.typography.caption, color: theme.colors.secondaryText },
    orderAmount: { ...theme.typography.subhead },
    emptyState: { alignItems: 'center', paddingVertical: theme.spacing.lg },
    emptyTitle: { ...theme.typography.subhead },
    emptyText: { ...theme.typography.caption, color: theme.colors.secondaryText, textAlign: 'center', marginTop: theme.spacing.xs },
  });
}
