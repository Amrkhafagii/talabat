import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverByUserId, getDriverEarningsStats } from '@/utils/database';
import { DeliveryDriver } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';

interface EarningsStats {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalEarnings: number;
  avgEarningsPerDelivery: number;
  totalDeliveries: number;
  totalHours: number;
  avgRating: number;
  totalCommission: number;
}

export default function DeliveryEarnings() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const { contentPadding, sectionGap } = useDeliveryLayout();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [stats, setStats] = useState<EarningsStats>({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    totalEarnings: 0,
    avgEarningsPerDelivery: 0,
    totalDeliveries: 0,
    totalHours: 0,
    avgRating: 0,
    totalCommission: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = useMemo(() => createStyles(theme, contentPadding, sectionGap), [theme, contentPadding, sectionGap]);

  useEffect(() => {
    const prev = theme.mode;
    // Earnings screen uses the dark palette.
    theme.setMode('dark');
    return () => theme.setMode(prev);
  }, [theme]);

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [user]);

  const loadDriverData = async () => {
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

      // Load earnings stats
      const statsData = await getDriverEarningsStats(driverData.id);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading driver data:', err);
      setError('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

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

  const getHourlyRate = () => {
    if (stats.totalHours === 0) return 0;
    return stats.totalEarnings / stats.totalHours;
  };

  const breakdown = useMemo(() => {
    const fees = stats.totalEarnings - (stats.totalCommission || 0);
    const tips = Math.max(0, stats.weekEarnings - fees);
    return [
      { label: 'Delivery Fees', value: fees },
      { label: 'Customer Tips', value: tips },
      { label: 'Bonuses', value: stats.totalCommission },
    ];
  }, [stats.totalCommission, stats.totalEarnings, stats.weekEarnings]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Earnings" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading earnings data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !driver) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Earnings" showBackButton />
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
      <Header title="Earnings" showBackButton />

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
      >
        <View style={styles.topSpacing} />
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

        {/* Main Earnings Display */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>This Week's Earnings</Text>
          <Text style={styles.heroAmount}>{formatCurrency(getPeriodEarnings())}</Text>
          <Text style={styles.heroSub}>Updated just now</Text>
        </Card>

        {/* Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.tileGrid}>
            <Card style={styles.tile}>
              <Text style={styles.tileLabel}>Per Delivery</Text>
              <Text style={styles.tileValue}>{formatCurrency(stats.avgEarningsPerDelivery)}</Text>
              <Text style={styles.tileDelta}>+5%</Text>
            </Card>
            <Card style={styles.tile}>
              <Text style={styles.tileLabel}>Per Hour</Text>
              <Text style={styles.tileValue}>{formatCurrency(getHourlyRate())}</Text>
              <Text style={[styles.tileDelta, { color: theme.colors.status.success }]}>+10%</Text>
            </Card>
            <Card style={styles.tile}>
              <Text style={styles.tileLabel}>Total Deliveries</Text>
              <Text style={styles.tileValue}>{stats.totalDeliveries}</Text>
              <Text style={[styles.tileDelta, { color: theme.colors.status.error }]}>-2</Text>
            </Card>
            <Card style={styles.tile}>
              <Text style={styles.tileLabel}>Rating</Text>
              <Text style={styles.tileValue}>{stats.avgRating.toFixed(1)} ⭐</Text>
              <Text style={[styles.tileDelta, { color: theme.colors.status.success }]}>+0.1</Text>
            </Card>
          </View>
        </View>

        {/* Breakdown */}
        <Card style={styles.listCard}>
          <Text style={styles.cardTitle}>Earnings Breakdown</Text>
          <View style={styles.list}>
            {breakdown.map((row) => (
              <View key={row.label} style={styles.listRow}>
                <Text style={styles.listLabel}>{row.label}</Text>
                <Text style={styles.listValue}>{formatCurrency(row.value || 0)}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Pro Tip */}
        <Card style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Info size={18} color={theme.colors.status.success} />
            <Text style={styles.tipTitle}>Pro Tip</Text>
          </View>
          <Text style={styles.tipBody}>
            You earn more during weekend dinner hours. Try driving between 6 PM - 9 PM for higher earnings.
          </Text>
          <View style={styles.progressWrap}>
            <Text style={styles.progressLabel}>Weekly Goal</Text>
            <Text style={styles.progressValue}>
              {formatCurrency(stats.totalEarnings)} / {formatCurrency(750)}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (stats.totalEarnings / 750) * 100)}%` }]} />
          </View>
        </Card>
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
    topSpacing: {
      height: theme.spacing.md,
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
    segmented: {
      marginHorizontal: contentPadding.horizontal,
      marginBottom: theme.spacing.lg,
    },
    heroCard: {
      marginHorizontal: contentPadding.horizontal,
      marginBottom: sectionGap,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      gap: theme.spacing.xs,
    },
    heroLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    heroAmount: { ...theme.typography.titleXl, color: theme.colors.text },
    heroSub: { ...theme.typography.caption, color: theme.colors.textMuted },
    section: {
      marginBottom: sectionGap,
    },
    sectionTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
      paddingHorizontal: contentPadding.horizontal,
      marginBottom: theme.spacing.md,
    },
    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, paddingHorizontal: contentPadding.horizontal },
    tile: { flexBasis: '47%', padding: theme.spacing.md, borderRadius: theme.radius.card, gap: theme.spacing.xs },
    tileLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    tileValue: { ...theme.typography.titleM, color: theme.colors.text },
    tileDelta: { ...theme.typography.caption, color: theme.colors.textMuted },
    listCard: { marginHorizontal: contentPadding.horizontal, marginBottom: sectionGap, padding: theme.spacing.lg, gap: theme.spacing.sm },
    cardTitle: { ...theme.typography.titleM, color: theme.colors.text },
    list: { gap: theme.spacing.sm },
    listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    listLabel: { ...theme.typography.body, color: theme.colors.text },
    listValue: { ...theme.typography.body, color: theme.colors.text },
    tipCard: { marginHorizontal: contentPadding.horizontal, marginBottom: sectionGap, padding: theme.spacing.lg, gap: theme.spacing.sm },
    tipHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    tipTitle: { ...theme.typography.subhead, color: theme.colors.text },
    tipBody: { ...theme.typography.body, color: theme.colors.textMuted },
    progressWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    progressValue: { ...theme.typography.caption, color: theme.colors.text },
    progressBar: { height: 10, borderRadius: 5, backgroundColor: theme.colors.surfaceAlt },
    progressFill: { height: 10, borderRadius: 5, backgroundColor: theme.colors.status.success },
  });
