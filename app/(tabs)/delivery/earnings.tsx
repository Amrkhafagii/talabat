import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DollarSign, TrendingUp, Calendar, Clock, Star, Target } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import StatCard from '@/components/common/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverByUserId, getDriverEarningsStats } from '@/utils/database';
import { DeliveryDriver } from '@/types/database';
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
  totalCommission: number;
}

export default function DeliveryEarnings() {
  const { user } = useAuth();
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Earnings" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
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
                 period === 'month' ? 'Month' : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Earnings Display */}
        <Card style={styles.mainEarningsCard}>
          <View style={styles.mainEarningsHeader}>
            <Text style={styles.periodLabel}>{getPeriodLabel()}</Text>
            <DollarSign size={32} color="#10B981" />
          </View>
          <Text style={styles.mainEarningsAmount}>
            {formatCurrency(getPeriodEarnings())}
          </Text>
          <Text style={styles.mainEarningsSubtext}>
            Total earnings for {getPeriodLabel().toLowerCase()}
          </Text>
        </Card>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon={TrendingUp}
              value={formatCurrency(stats.avgEarningsPerDelivery)}
              label="Per Delivery"
              iconColor="#3B82F6"
            />
            <StatCard
              icon={Clock}
              value={formatCurrency(getHourlyRate())}
              label="Per Hour"
              iconColor="#F59E0B"
            />
            <StatCard
              icon={Target}
              value={stats.totalDeliveries}
              label="Deliveries"
              iconColor="#8B5CF6"
            />
            <StatCard
              icon={Star}
              value={stats.avgRating.toFixed(1)}
              label="Rating"
              iconColor="#FFB800"
            />
            <StatCard
              icon={DollarSign}
              value={formatCurrency(stats.totalCommission)}
              label="Commission"
              iconColor="#EF4444"
            />
          </View>
          <Text style={styles.commissionNote}>
            Commission rule: max(10% of order total, 30 EGP) charged to the customer.
          </Text>
        </View>

        {/* Detailed Breakdown */}
        <Card style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>Earnings Breakdown</Text>
          
          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Calendar size={20} color="#10B981" />
                <Text style={styles.breakdownLabel}>Today</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {formatCurrency(stats.todayEarnings)}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Calendar size={20} color="#3B82F6" />
                <Text style={styles.breakdownLabel}>This Week</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {formatCurrency(stats.weekEarnings)}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Calendar size={20} color="#F59E0B" />
                <Text style={styles.breakdownLabel}>This Month</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {formatCurrency(stats.monthEarnings)}
              </Text>
            </View>

            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <TrendingUp size={20} color="#8B5CF6" />
                <Text style={styles.breakdownLabel}>All Time</Text>
              </View>
              <Text style={styles.breakdownValue}>
                {formatCurrency(stats.totalEarnings)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Goals and Insights */}
        <Card style={styles.insightsCard}>
          <Text style={styles.cardTitle}>Insights & Goals</Text>
          
          <View style={styles.insightItem}>
            <Text style={styles.insightLabel}>Hours Worked</Text>
            <Text style={styles.insightValue}>{Math.round(stats.totalHours)} hours</Text>
          </View>

          <View style={styles.insightItem}>
            <Text style={styles.insightLabel}>Average Hourly Rate</Text>
            <Text style={styles.insightValue}>{formatCurrency(getHourlyRate())}/hour</Text>
          </View>

          <View style={styles.insightItem}>
            <Text style={styles.insightLabel}>Total Deliveries</Text>
            <Text style={styles.insightValue}>{stats.totalDeliveries} deliveries</Text>
          </View>

          <View style={styles.insightItem}>
            <Text style={styles.insightLabel}>Customer Rating</Text>
            <Text style={styles.insightValue}>{stats.avgRating.toFixed(1)} ⭐</Text>
          </View>

          <View style={styles.goalContainer}>
            <Text style={styles.goalTitle}>💡 Tip to Increase Earnings</Text>
            <Text style={styles.goalText}>
              {stats.avgRating < 4.5 
                ? "Focus on improving your customer rating to get more delivery requests!"
                : "Great rating! Consider working during peak hours (lunch & dinner) to maximize earnings."
              }
            </Text>
          </View>
        </Card>
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
    marginBottom: 16,
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
  mainEarningsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
    paddingVertical: 32,
  },
  mainEarningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  periodLabel: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginRight: 12,
  },
  mainEarningsAmount: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginBottom: 8,
  },
  mainEarningsSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  breakdownCard: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 20,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  commissionNote: {
    marginTop: 12,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 2,
  },
  breakdownItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  breakdownValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  insightsCard: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  insightLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  insightValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  goalContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  goalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 8,
  },
  goalText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
});
