import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Filter, Bell } from 'lucide-react-native';

import OrderManagementCard from '@/components/restaurant/OrderManagementCard';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { getRestaurantByUserId, releaseOrderPayment, getPushTokens } from '@/utils/database';
import { sendPushNotification } from '@/utils/push';
import { Restaurant } from '@/types/database';
import { formatOrderTime } from '@/utils/formatters';
import { getOrderItems } from '@/utils/orderHelpers';

export default function RestaurantOrders() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [selectedTab, setSelectedTab] = useState('active');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use realtime orders hook
  const { 
    orders, 
    loading: ordersLoading, 
    error: ordersError, 
    updateOrderStatus,
    refetch: refetchOrders
  } = useRealtimeOrders({
    restaurantId: restaurant?.id
  });

  useEffect(() => {
    if (user) {
      loadRestaurantData();
    }
  }, [user]);

  const loadRestaurantData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const restaurantData = await getRestaurantByUserId(user.id);
      setRestaurant(restaurantData);
    } catch (error) {
      console.error('Error loading restaurant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchOrders();
    setRefreshing(false);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const success = await updateOrderStatus(orderId, newStatus);
      if (!success) {
        Alert.alert('Error', 'Failed to update order status');
      } else if (newStatus === 'delivered') {
        await releaseOrderPayment(orderId);
        // Notify customer about delivery
        const tokens = await getPushTokens([orders.find(o => o.id === orderId)?.user_id || ''].filter(Boolean) as string[]);
        await Promise.all(tokens.map(token => sendPushNotification(token, 'Order Delivered', 'Your order has been delivered.', { orderId })));
      } else if (['confirmed', 'preparing', 'ready'].includes(newStatus)) {
        const order = orders.find(o => o.id === orderId);
        if (order?.user_id) {
          const tokens = await getPushTokens([order.user_id]);
          const statusTitle = newStatus === 'ready' ? 'Order Ready' : 'Order Update';
          const statusBody = newStatus === 'ready'
            ? 'Your order is ready for pickup.'
            : newStatus === 'preparing'
              ? 'Your order is being prepared.'
              : 'Your order was accepted.';
          await Promise.all(tokens.map(token => sendPushNotification(token, statusTitle, statusBody, { orderId })));
        }
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const activeOrders = orders.filter(order => 
    !['delivered', 'cancelled'].includes(order.status)
  );
  const pastOrders = orders.filter(order => 
    ['delivered', 'cancelled'].includes(order.status)
  );
  
  const displayOrders = selectedTab === 'active' ? activeOrders : pastOrders;
  const newOrdersCount = orders.filter(order => order.status === 'pending').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.headerRight}>
          <RealtimeIndicator />
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={20} color="#6B7280" />
            {newOrdersCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>{newOrdersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'active' && styles.activeTab]}
          onPress={() => setSelectedTab('active')}
        >
          <Text style={[styles.tabText, selectedTab === 'active' && styles.activeTabText]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'past' && styles.activeTab]}
          onPress={() => setSelectedTab('past')}
        >
          <Text style={[styles.tabText, selectedTab === 'past' && styles.activeTabText]}>
            Past ({pastOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
      >
        {ordersLoading && orders.length === 0 ? (
          <View style={styles.ordersLoading}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.ordersLoadingText}>Loading orders...</Text>
          </View>
        ) : displayOrders.length > 0 ? (
          <View style={styles.ordersContainer}>
            {displayOrders.map((order) => (
              <OrderManagementCard
                key={order.id}
                order={{
                  id: order.id,
                  orderNumber: `#${order.id.slice(-6).toUpperCase()}`,
                  customer: `Customer ${order.user_id.slice(-4)}`,
                  items: getOrderItems(order),
                  total: order.total,
                  status: order.status === 'pending' ? 'new' : 
                         order.status === 'preparing' ? 'preparing' : 
                         order.status === 'ready' ? 'ready' : 'preparing',
                  time: formatOrderTime(order.created_at)
                }}
                onAccept={order.status === 'pending' ? () => handleUpdateOrderStatus(order.id, 'confirmed') : undefined}
                onReject={order.status === 'pending' ? () => handleUpdateOrderStatus(order.id, 'cancelled') : undefined}
                onMarkReady={order.status === 'preparing' || order.status === 'confirmed' ? () => handleUpdateOrderStatus(order.id, 'ready') : undefined}
                onMarkDelivered={order.status === 'ready' ? () => handleUpdateOrderStatus(order.id, 'picked_up') : undefined}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyText}>
              {selectedTab === 'active' 
                ? 'No active orders at the moment'
                : 'No past orders to display'
              }
            </Text>
          </View>
        )}

        {ordersError && (
          <View style={styles.errorState}>
            <Text style={styles.errorStateText}>{ordersError}</Text>
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  filterButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FF6B35',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  ordersContainer: {
    paddingHorizontal: 20,
  },
  ordersLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  ordersLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  errorStateText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter-Regular',
  },
});
