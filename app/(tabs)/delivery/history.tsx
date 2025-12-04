import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, Clock, MapPin, Star, TrendingUp, Filter } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import StatCard from '@/components/common/StatCard';
import DeliveryHistoryCard from '@/components/delivery/DeliveryHistoryCard';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverByUserId, getDriverDeliveryHistory, getDriverEarningsStats } from '@/utils/database';
import { DeliveryDriver, Delivery } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';

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

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [user, selectedPeriod]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Delivery History" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
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
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['today', 'week', 'month', 'all'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.selectedPeriodButton
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.selectedPeriodButtonText
              ]}>
                {period === 'today' ? 'Today' : 
                 period === 'week' ? 'Week' : 
                 period === 'month' ? 'Month' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Earnings Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getPeriodLabel()} Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon={DollarSign}
              value={formatCurrency(getPeriodEarnings())}
              label="Earnings"
              iconColor="#10B981"
            />
            <StatCard
              icon={TrendingUp}
              value={deliveries.length}
              label="Deliveries"
              iconColor="#3B82F6"
            />
            <StatCard
              icon={Clock}
              value={`${Math.round(stats.totalHours)}h`}
              label="Hours"
              iconColor="#F59E0B"
            />
            <StatCard
              icon={Star}
              value={stats.avgRating.toFixed(1)}
              label="Rating"
              iconColor="#FFB800"
            />
          </View>
        </View>

        {/* Earnings Breakdown */}
        <Card style={styles.earningsCard}>
          <Text style={styles.cardTitle}>Earnings Breakdown</Text>
          <View style={styles.earningsBreakdown}>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Average per delivery</Text>
              <Text style={styles.earningsValue}>
                {formatCurrency(stats.avgEarningsPerDelivery)}
              </Text>
            </View>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Total deliveries</Text>
              <Text style={styles.earningsValue}>{stats.totalDeliveries}</Text>
            </View>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Hours worked</Text>
              <Text style={styles.earningsValue}>{Math.round(stats.totalHours)}h</Text>
            </View>
            <View style={[styles.earningsRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total earnings</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(stats.totalEarnings)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Delivery History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery History</Text>
            <TouchableOpacity style={styles.filterButton}>
              <Filter size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {deliveries.length > 0 ? (
            <View style={styles.deliveriesContainer}>
              {deliveries.map((delivery) => (
                <DeliveryHistoryCard
                  key={delivery.id}
                  delivery={{
                    id: delivery.id,
                    orderNumber: delivery.order?.order_number || `#${delivery.id.slice(-6).toUpperCase()}`,
                    restaurantName: delivery.order?.restaurant?.name || 'Unknown Restaurant',
                    customerAddress: delivery.delivery_address,
                    distance: delivery.distance_km ? `${delivery.distance_km} km` : '2.1 km',
                    duration: delivery.estimated_duration_minutes ? `${delivery.estimated_duration_minutes} min` : '15 min',
                    earnings: delivery.driver_earnings,
                    completedAt: delivery.delivered_at || delivery.created_at,
                    rating: 4.8, // This would come from reviews
                    tip: 0 // This would be calculated from order data
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MapPin size={48} color="#9CA3AF" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  selectedPeriodButton: {
    backgroundColor: '#FF6B35',
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  selectedPeriodButtonText: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  earningsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  earningsBreakdown: {
    gap: 12,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  earningsValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter-Medium',
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  deliveriesContainer: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});