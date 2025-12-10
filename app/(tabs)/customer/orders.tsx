import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Header from '@/components/ui/Header';
import OrderCard from '@/components/customer/OrderCard';
import Button from '@/components/ui/Button';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { formatOrderTime } from '@/utils/formatters';
import { getOrderItems } from '@/utils/orderHelpers';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function Orders() {
  const [selectedTab, setSelectedTab] = useState('active');
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { orders, loading, error, refetch } = useRealtimeOrders({
    userId: user?.id
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    refetch();
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  const activeOrders = orders.filter(order => 
    !['delivered', 'cancelled'].includes(order.status)
  );
  const pastOrders = orders.filter(order => 
    ['delivered', 'cancelled'].includes(order.status)
  );
  
  const displayOrders = selectedTab === 'active' ? activeOrders : pastOrders;

  const trackOrder = (orderId: string) => {
    router.push({
      pathname: '/customer/track-order',
      params: { orderId }
    });
  };

  const reorder = (orderId: string) => {
    console.log('Reorder:', orderId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="My Orders" 
        showBackButton 
        rightComponent={<RealtimeIndicator />}
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'active' && styles.activeTab]}
          onPress={() => setSelectedTab('active')}
          activeOpacity={0.9}
        >
          <Text style={[styles.tabText, selectedTab === 'active' && styles.activeTabText]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'past' && styles.activeTab]}
          onPress={() => setSelectedTab('past')}
          activeOpacity={0.9}
        >
          <Text style={[styles.tabText, selectedTab === 'past' && styles.activeTabText]}>
            Past ({pastOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Icon name="AlertTriangle" size="md" color={theme.colors.status.error} />
            <Text style={styles.errorTitle}>Some recent orders failed to load.</Text>
            <Button title="Retry" onPress={handleRefresh} variant="outline" style={styles.retryButton} />
          </View>
        )}

        {displayOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={{
              id: order.id,
              restaurantName: order.restaurant?.name || 'Unknown Restaurant',
              items: getOrderItems(order),
              total: order.total,
              status: order.status as any,
              orderTime: formatOrderTime(order.created_at),
              deliveryTime: !['delivered', 'cancelled'].includes(order.status) ? '25-30 min' : undefined,
              address: order.delivery_address,
              estimatedDelivery: order.estimated_delivery_time
            }}
            onTrack={!['delivered', 'cancelled'].includes(order.status) ? () => trackOrder(order.id) : undefined}
            onReorder={['delivered'].includes(order.status) ? () => reorder(order.id) : undefined}
          />
        ))}

        {displayOrders.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.dottedCard}>
              <Icon name="Receipt" size="lg" color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No orders {selectedTab === 'active' ? 'in progress' : 'yet'}</Text>
              <Text style={styles.emptyText}>
                {selectedTab === 'active' ? 'Track live orders here once you place them.' : 'Start your first order to see it here.'}
              </Text>
            </View>
            <Button
              title="Explore Restaurants"
              onPress={() => router.push('/(tabs)/customer' as any)}
              style={styles.exploreButton}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textMuted,
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
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceAlt,
    },
    activeTab: {
      backgroundColor: theme.colors.primary[50],
      borderWidth: 1,
      borderColor: theme.colors.primary[500],
    },
    tabText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.textMuted,
    },
    activeTabText: {
      color: theme.colors.primary[600],
    },
    content: {
      flex: 1,
      paddingTop: 16,
    },
    errorCard: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.status.warning,
      backgroundColor: theme.colors.statusSoft.warning,
      padding: 16,
      borderRadius: theme.radius.card,
      alignItems: 'center',
      gap: 8,
    },
    errorTitle: { fontFamily: 'Inter-Medium', color: theme.colors.status.warning, textAlign: 'center' },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    exploreButton: {
      marginTop: 16,
    },
    dottedCard: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      padding: 20,
      alignItems: 'center',
      gap: 8,
    },
  });
