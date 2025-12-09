import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl, FlatList, I18nManager, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { ListSkeleton } from '@/components/restaurant/Skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { getRestaurantByUserId, releaseOrderPayment, getPushTokens, assignNearestDriverForOrder, logOrderEvent } from '@/utils/database';
import { sendPushNotification } from '@/utils/push';
import { Restaurant } from '@/types/database';
import { formatOrderTime } from '@/utils/formatters';
import { getOrderItems } from '@/utils/orderHelpers';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { getOrderStatusToken, getPaymentStatusToken } from '@/styles/statusTokens';
import { wp, hp } from '@/styles/responsive';
import { Icon } from '@/components/ui/Icon';

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
        Alert.alert('Error', newStatus === 'delivered' ? 'Delivery must be completed by the driver.' : 'Failed to update order status');
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
        <StatusBar style="dark" backgroundColor={theme.colors.background} />
        <View style={styles.loadingContainer}>
          <ListSkeleton rows={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Orders</Text>
          <Text style={styles.headerSubtitle}>Manage active and past orders</Text>
        </View>
        <View style={styles.headerActions}>
          <RealtimeIndicator />
          <TouchableOpacity style={styles.notificationButton} hitSlop={theme.tap.hitSlop}>
            <Icon name="Bell" size={theme.iconSizes.md} color={theme.colors.text} />
            {newOrdersCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>{newOrdersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsWrapper}>
        <SegmentedControl
          options={[
            { value: 'active', label: 'Active Orders' },
            { value: 'past', label: 'Past Orders' },
          ]}
          value={selectedTab as 'active' | 'past'}
          onChange={(key) => setSelectedTab(key)}
          fullWidth
        />
      </View>

      <FlatList
        data={displayOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
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

    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const horizontal = Math.max(theme.spacing.md, wp('5%'));
  const vertical = Math.max(theme.spacing.md, hp('2%'));
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background, writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
    loadingText: { ...theme.typography.body, color: theme.colors.secondaryText, marginTop: theme.spacing.sm },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: horizontal,
      paddingVertical: vertical,
      backgroundColor: theme.colors.background,
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    headerTitle: { ...theme.typography.titleL },
    headerSubtitle: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: 2 },
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
    notificationCount: { fontSize: 10, fontFamily: 'Inter-Bold', color: theme.colors.textInverse },
    tabsWrapper: { paddingHorizontal: horizontal, paddingBottom: vertical },
    filterButton: { padding: theme.spacing.xs },
    ordersLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Math.max(theme.spacing.xl, hp('3%')),
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
    listContent: {
      paddingHorizontal: horizontal,
      paddingBottom: theme.insets.bottom + Math.max(theme.spacing.xl, hp('3%')),
      paddingTop: theme.spacing.sm,
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

  const statusToken = getOrderStatusToken(order.status, theme);
  const paymentToken = getPaymentStatusToken(order.payment_status, theme);
  const items = getOrderItems(order).join(', ');
  const paymentApproved = ['paid', 'captured'].includes(order.payment_status);
  const showAccept = order.status === 'pending' && paymentApproved;
  const showReject = order.status === 'pending';
  const showReady = ['confirmed', 'preparing'].includes(order.status);
  const showHandedToCourier = order.status === 'ready';
  const customerName = order.customer_name || `Customer ${order.user_id.slice(-4)}`;
  const displayId = order.short_code || order.order_number || order.id.slice(-6).toUpperCase();

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(order.id)} activeOpacity={0.9}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>Order #{displayId}</Text>
          <Text style={styles.customer}>{customerName}</Text>
        </View>
        <View style={styles.badgeStack}>
          <Badge label={statusToken.label} backgroundColor={statusToken.background} textColor={statusToken.color} />
          {paymentToken ? (
            <Badge label={paymentToken.label} backgroundColor={paymentToken.background} textColor={paymentToken.color} style={styles.paymentChip} />
          ) : null}
        </View>
      </View>

      <Text style={styles.items} numberOfLines={2}>{items}</Text>
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
        </View>
        <Text style={styles.meta}>Placed {formatOrderTime(order.created_at)}</Text>
      </View>

      {(showReject || showAccept || showReady || showHandedToCourier) && (
        <View style={[styles.actions, showReject && showAccept ? styles.actionsRow : null]}>
          {showReject && (
            <Button
              title="Reject"
              variant="danger"
              size="medium"
              pill
              style={showAccept ? styles.halfButton : undefined}
              onPress={() => onAction(order.id, 'cancelled', 'Restaurant rejected')}
            />
          )}
          {showAccept && (
            <Button
              title="Accept"
              size="medium"
              pill
              style={showReject ? styles.halfButton : undefined}
              onPress={() => onAction(order.id, 'confirmed')}
            />
          )}
          {showReady && (
            <Button title="Ready for Pickup" size="medium" pill fullWidth onPress={() => onAction(order.id, 'ready')} />
          )}
          {showHandedToCourier && (
            <Button title="Handed to Courier" size="medium" pill variant="secondary" fullWidth onPress={() => onAction(order.id, 'picked_up')} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function createCardStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      ...theme.shadows.card,
      gap: theme.spacing.sm,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm },
    badgeStack: { alignItems: 'flex-end', gap: theme.spacing.xs },
    paymentChip: { marginTop: 0 },
    orderId: { ...theme.typography.titleM },
    customer: { ...theme.typography.subhead, marginTop: 2 },
    items: { ...theme.typography.caption, color: theme.colors.secondaryText, lineHeight: 20 },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    totalLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    totalValue: { ...theme.typography.title2 },
    meta: { ...theme.typography.caption, color: theme.colors.secondaryText },
    actions: { flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
    actionsRow: { flexDirection: 'row', gap: theme.spacing.sm },
    halfButton: { flex: 1 },
  });
}
