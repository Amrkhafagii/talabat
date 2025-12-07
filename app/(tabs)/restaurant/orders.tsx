import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Filter, Bell, Clock3 } from 'lucide-react-native';
import { router } from 'expo-router';

import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { getRestaurantByUserId, releaseOrderPayment, getPushTokens, assignNearestDriverForOrder, logOrderEvent } from '@/utils/database';
import { sendPushNotification } from '@/utils/push';
import { Restaurant } from '@/types/database';
import { formatOrderTime } from '@/utils/formatters';
import { getOrderItems } from '@/utils/orderHelpers';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import PillTabs from '@/components/ui/PillTabs';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import FAB from '@/components/ui/FAB';

export default function RestaurantOrders() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
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

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, cancellationReason?: string) => {
    try {
      const success = await updateOrderStatus(orderId, newStatus, { cancellationReason });
      if (!success) {
        Alert.alert('Error', 'Failed to update order status');
        return;
      }
      await logOrderEvent(orderId, newStatus, cancellationReason, user?.id);

      if (newStatus === 'delivered') {
        await releaseOrderPayment(orderId);
        // Notify customer about delivery
        const { data: tokens } = await getPushTokens([orders.find(o => o.id === orderId)?.user_id || ''].filter(Boolean) as string[]);
        await Promise.all((tokens || []).map(token => sendPushNotification(token, 'Order Delivered', 'Your order has been delivered.', { orderId })));
      }

      if (newStatus === 'ready') {
        const assignment = await assignNearestDriverForOrder(orderId, 5);
        if (!assignment.ok) {
          Alert.alert(
            'No nearby driver yet',
            'We could not find an available driver within 5 km. The order will stay visible to drivers.'
          );
        }
      }

      if (['confirmed', 'preparing', 'ready'].includes(newStatus)) {
        const order = orders.find(o => o.id === orderId);
        if (order?.user_id) {
          const { data: tokens } = await getPushTokens([order.user_id]);
          const statusTitle = newStatus === 'ready' ? 'Order Ready' : 'Order Update';
          const statusBody = newStatus === 'ready'
            ? 'Your order is ready for pickup.'
            : newStatus === 'preparing'
              ? 'Your order is being prepared.'
              : 'Your order was accepted.';
          await Promise.all((tokens || []).map(token => sendPushNotification(token, statusTitle, statusBody, { orderId })));
        }
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const activeOrders = useMemo(
    () => orders.filter(order => !['delivered', 'cancelled'].includes(order.status)),
    [orders]
  );
  const pastOrders = useMemo(
    () => orders.filter(order => ['delivered', 'cancelled'].includes(order.status)),
    [orders]
  );
  const displayOrders = selectedTab === 'active' ? activeOrders : pastOrders;
  const newOrdersCount = orders.filter(order => order.status === 'pending').length;

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleOpenOrderDetail = useCallback((orderId: string) => {
    router.push({
      pathname: '/(tabs)/restaurant/order-detail/[orderId]',
      params: { orderId },
    } as any);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.headerRight}>
          <RealtimeIndicator />
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={20} color={theme.colors.secondaryText} />
            {newOrdersCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>{newOrdersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color={theme.colors.secondaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <PillTabs
        tabs={[
          { key: 'active', label: `Active (${activeOrders.length})` },
          { key: 'past', label: `Past (${pastOrders.length})` },
        ]}
        activeKey={selectedTab}
        onChange={setSelectedTab}
        style={{ marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md }}
        scrollable={false}
      />

      <FlatList
        data={displayOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{selectedTab === 'active' ? 'All caught up!' : 'No past orders'}</Text>
            <Text style={styles.emptyText}>
              {selectedTab === 'active'
                ? 'No new active orders right now.'
                : 'Completed and cancelled orders will appear here.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <OrderCard order={item} onPress={handleOpenOrderDetail} onAction={handleUpdateOrderStatus} />}
        ListHeaderComponent={
          ordersLoading && orders.length === 0 ? (
            <View style={styles.ordersLoading}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.ordersLoadingText}>Loading orders...</Text>
            </View>
          ) : null
        }
      />

      <FAB
        icon={<Filter size={22} color="#FFFFFF" />}
        onPress={() => {}}
        style={styles.fab}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const horizontal = theme.device.isSmallScreen ? theme.spacing.md : theme.spacing.lg;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
    loadingText: { ...theme.typography.body, color: theme.colors.secondaryText, marginTop: theme.spacing.sm },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: horizontal,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: { ...theme.typography.title2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    notificationButton: { position: 'relative', padding: theme.spacing.xs },
    notificationBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationCount: { fontSize: 10, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
    filterButton: { padding: theme.spacing.xs },
    tabContainer: {
      // deprecated: replaced by PillTabs
    },
    content: {
      flex: 1,
      paddingTop: theme.spacing.md,
    },
    ordersLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
    },
    ordersLoadingText: {
      ...theme.typography.caption,
      color: theme.colors.secondaryText,
      marginLeft: theme.spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl2,
      paddingHorizontal: theme.spacing.xl,
    },
    emptyTitle: {
      ...theme.typography.title2,
      marginBottom: theme.spacing.xs,
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      lineHeight: 24,
    },
    listContent: { paddingHorizontal: horizontal, paddingBottom: theme.insets.bottom + theme.spacing.xl },
    fab: {
      position: 'absolute',
      right: theme.spacing.lg,
      bottom: theme.insets.bottom + theme.spacing.lg,
    },
  });
}

function OrderCard({
  order,
  onPress,
  onAction,
}: {
  order: any;
  onPress: (id: string) => void;
  onAction: (orderId: string, newStatus: string, reason?: string) => void;
}) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createCardStyles(theme), [theme]);

  const paymentVariant = order.payment_status === 'paid' ? 'success' : 'hold';
  const paymentLabel = order.payment_status === 'paid' ? 'Paid' : 'Payment on Hold';
  const statusLabel = mapStatus(order.status);
  const items = getOrderItems(order).join(', ');
  const showAccept = order.status === 'pending' && order.payment_status === 'paid';
  const showReject = order.status === 'pending';
  const showReady = ['confirmed', 'preparing'].includes(order.status);
  const showDelivered = order.status === 'ready';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(order.id)} activeOpacity={0.9}>
      <View style={styles.header}>
        <Text style={styles.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
        <Badge text={statusLabel} variant="secondary" size="small" />
      </View>
      <Text style={styles.meta}>Placed {formatOrderTime(order.created_at)}</Text>
      <Text style={styles.customer}>Customer {order.user_id.slice(-4)}</Text>
      <Text style={styles.items} numberOfLines={1}>{items}</Text>
      <View style={styles.row}>
        <Badge text={paymentLabel} variant={paymentVariant as any} size="small" />
        <Text style={styles.total}>${order.total.toFixed(2)}</Text>
      </View>
      <View style={styles.actions}>
        {showReject && (
          <Button title="Reject" variant="secondary" size="small" onPress={() => onAction(order.id, 'cancelled', 'Restaurant rejected')} />
        )}
        {showAccept && (
          <Button title="Accept" size="small" onPress={() => onAction(order.id, 'confirmed')} />
        )}
        {showReady && (
          <Button title="Ready for Pickup" size="small" onPress={() => onAction(order.id, 'ready')} />
        )}
        {showDelivered && (
          <Button title="Mark Delivered" size="small" variant="secondary" onPress={() => onAction(order.id, 'picked_up')} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function mapStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Accepted';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready';
    case 'picked_up':
      return 'Out for Delivery';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function createCardStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.card,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderId: { ...theme.typography.subhead },
    meta: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: 2 },
    customer: { ...theme.typography.body, marginTop: theme.spacing.xs },
    items: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: 2 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.sm },
    total: { ...theme.typography.subhead },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm },
  });
}
