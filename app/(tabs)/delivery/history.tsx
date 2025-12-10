import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverByUserId, getDriverDeliveryHistory, getDriverEarningsStats } from '@/utils/database';
import { DeliveryDriver, Delivery } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import SegmentedControl from '@/components/ui/SegmentedControl';

interface EarningsStats {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalEarnings: number;
  avgEarningsPerDelivery: number;
  totalDeliveries: number;
  totalHours: number;
  avgRating: number;
}

export default function DeliveryHistory() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const { contentPadding, sectionGap } = useDeliveryLayout();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    totalEarnings: 0,
    avgEarningsPerDelivery: 0,
    totalDeliveries: 0,
    totalHours: 0,
    avgRating: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = useMemo(() => createStyles(theme, contentPadding, sectionGap), [theme, contentPadding, sectionGap]);

  const loadDriverData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const driverData = await getDriverByUserId(user.id);
      if (!driverData) {
        setError('Driver profile not found');
        return;
      }

      setDriver(driverData);

      // Load delivery history and stats
      const [deliveriesData, statsData] = await Promise.all([
        getDriverDeliveryHistory(driverData.id, selectedPeriod),
        getDriverEarningsStats(driverData.id)
      ]);

      setDeliveries(deliveriesData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading driver data:', err);
      setError('Failed to load delivery history');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, user]);

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [loadDriverData, user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDriverData();
    setRefreshing(false);
  };

  const getPeriodEarnings = () => {
    switch (selectedPeriod) {
      case 'today':
        return stats.todayEarnings;
      case 'week':
        return stats.weekEarnings;
      case 'month':
        return stats.monthEarnings;
      case 'all':
        return stats.totalEarnings;
      default:
        return stats.weekEarnings;
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'all':
        return 'All Time';
      default:
        return 'This Week';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Delivery History" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading delivery history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !driver) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Delivery History" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Driver profile not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDriverData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Delivery History" showBackButton />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        {/* Period Selector */}
        <SegmentedControl
          options={[
            { label: 'Today', value: 'today' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
            { label: 'All', value: 'all' },
          ]}
          value={selectedPeriod}
          onChange={setSelectedPeriod}
          style={styles.segmented}
        />

        {/* Overview */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroTitle}>Delivery History</Text>
          <Text style={styles.heroAmount}>{formatCurrency(getPeriodEarnings())}</Text>
          <Text style={styles.heroSub}>Earnings • {getPeriodLabel()}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Deliveries</Text>
              <Text style={styles.heroStatValue}>{deliveries.length}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Hours Online</Text>
              <Text style={styles.heroStatValue}>{Math.round(stats.totalHours)}h</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Rating</Text>
              <Text style={styles.heroStatValue}>{stats.avgRating.toFixed(1)} ⭐</Text>
            </View>
          </View>
        </Card>

        {/* Stat tiles */}
        <View style={styles.statGrid}>
          <Card style={styles.tile}>
            <Text style={styles.tileLabel}>Total Deliveries</Text>
            <Text style={styles.tileValue}>{deliveries.length}</Text>
          </Card>
          <Card style={styles.tile}>
            <Text style={styles.tileLabel}>Total Distance</Text>
            <Text style={styles.tileValue}>
              {(() => {
                const dist = deliveries.reduce((sum, d) => sum + (Number(d.distance_km) || 0), 0);
                return `${dist.toFixed(1)} km`;
              })()}
            </Text>
          </Card>
          <Card style={styles.tile}>
            <Text style={styles.tileLabel}>Average Rating</Text>
            <Text style={styles.tileValue}>{stats.avgRating.toFixed(1)} ⭐</Text>
          </Card>
          <Card style={styles.tile}>
            <Text style={styles.tileLabel}>Time Online</Text>
            <Text style={styles.tileValue}>{Math.round(stats.totalHours)}h</Text>
          </Card>
        </View>

        {/* Delivery History */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>Completed Deliveries</Text>
          {deliveries.length > 0 ? (
            <View style={styles.deliveriesContainer}>
              {deliveries.map((delivery) => (
                <Card key={delivery.id} style={styles.listCard}>
                  <View style={styles.listHeader}>
                    <View style={styles.listIcon}>
                      <Icon name="Package" size="sm" color={theme.colors.accent} />
                    </View>
                    <View style={styles.listText}>
                      <Text style={styles.listTitle}>{delivery.order?.restaurant?.name || 'Restaurant'}</Text>
                      <Text style={styles.listSubtitle}>{delivery.delivered_at ? new Date(delivery.delivered_at).toLocaleString() : ''}</Text>
                    </View>
                    <Text style={styles.listAmount}>{formatCurrency(delivery.driver_earnings || 0)}</Text>
                  </View>
                  <View style={styles.listMeta}>
                    <Text style={styles.metaText}>{delivery.delivery_address}</Text>
                    <Text style={styles.metaText}>{delivery.distance_km ? `${delivery.distance_km} km` : ''}</Text>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="MapPin" size={48} color={theme.colors.textSubtle} />
              <Text style={styles.emptyTitle}>No deliveries found</Text>
              <Text style={styles.emptyText}>
                {selectedPeriod === 'today' 
                  ? 'No deliveries completed today'
                  : `No deliveries found for ${getPeriodLabel().toLowerCase()}`
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  theme: ReturnType<typeof useRestaurantTheme>,
  contentPadding: { horizontal: number; top: number; bottom: number },
  sectionGap: number
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: contentPadding.horizontal,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.sm,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: contentPadding.horizontal,
    },
    errorText: {
      ...theme.typography.body,
      color: theme.colors.status.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.lg,
    },
    retryButtonText: {
      ...theme.typography.button,
      color: theme.colors.textInverse,
    },
    segmented: { marginHorizontal: contentPadding.horizontal, marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
    section: {
      marginBottom: sectionGap,
    },
    heroCard: {
      marginHorizontal: contentPadding.horizontal,
      marginBottom: sectionGap,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.card,
      gap: theme.spacing.sm,
    },
    heroTitle: { ...theme.typography.titleM, color: theme.colors.text },
    heroAmount: { ...theme.typography.titleXl, color: theme.colors.text },
    heroSub: { ...theme.typography.caption, color: theme.colors.textMuted },
    heroRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm },
    heroStat: { flex: 1, padding: theme.spacing.sm, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md },
    heroStatLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    heroStatValue: { ...theme.typography.subhead, color: theme.colors.text },
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      paddingHorizontal: contentPadding.horizontal,
      marginBottom: sectionGap,
    },
    tile: {
      flexBasis: '47%',
      padding: theme.spacing.md,
      borderRadius: theme.radius.card,
      gap: theme.spacing.xs,
    },
    tileLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    tileValue: { ...theme.typography.titleM, color: theme.colors.text },
    sectionHeaderTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
      paddingHorizontal: contentPadding.horizontal,
      marginBottom: theme.spacing.sm,
    },
    deliveriesContainer: {
      paddingHorizontal: contentPadding.horizontal,
      gap: theme.spacing.md,
    },
    listCard: { padding: theme.spacing.md, gap: theme.spacing.sm },
    listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    listIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.colors.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    listText: { flex: 1 },
    listTitle: { ...theme.typography.body, color: theme.colors.text },
    listSubtitle: { ...theme.typography.caption, color: theme.colors.textMuted },
    listAmount: { ...theme.typography.subhead, color: theme.colors.success },
    listMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    metaText: { ...theme.typography.caption, color: theme.colors.textMuted },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl2,
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  });
