import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { getOrderById } from '@/utils/database';
import { getOrderTimeline, OrderTimelineEvent } from '@/utils/db/orderEvents';
import { Order } from '@/types/database';
import TimelineItem from '@/components/ui/TimelineItem';

export default function OrderDetailScreen() {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      load();
    }
  }, [orderId]);

  const load = async () => {
    setLoading(true);
    const detail = await getOrderById(String(orderId));
    setOrder(detail);
    const events = await getOrderTimeline(String(orderId));
    setTimeline(events);
    setLoading(false);
  };

  if (!orderId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <Text style={styles.errorText}>Order not found</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={theme.tap.hitSlop}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Detail</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <Text style={styles.errorText}>Order not found</Text>
      </SafeAreaView>
    );
  }

  const paymentBadge = order.payment_status === 'paid' ? 'Paid' : 'Payment on Hold';
  const paymentColor = order.payment_status === 'paid' ? theme.colors.status.success : theme.colors.status.warning;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={theme.tap.hitSlop}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Order #{order.id.slice(-6).toUpperCase()}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.insets.bottom + theme.spacing.xl }}>
        <View style={styles.statusBanner}>
          <Text style={styles.statusLabel}>{statusLabel(order.status)}</Text>
          <View style={[styles.paymentPill, { borderColor: paymentColor, backgroundColor: paymentColor + '22' }]}>
            <Text style={[styles.paymentText, { color: paymentColor }]}>{paymentBadge}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.order_items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.menu_item?.name || 'Item'}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>${(item.total_price ?? 0).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <Row label="Subtotal" value={`$${order.subtotal.toFixed(2)}`} />
          <Row label="Delivery" value={`$${order.delivery_fee.toFixed(2)}`} />
          <Row label="Tax" value={`$${order.tax_amount.toFixed(2)}`} />
          <Row label="Tip" value={`$${order.tip_amount.toFixed(2)}`} />
          <Row label="Total" value={`$${order.total.toFixed(2)}`} bold />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.contactRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{order.user?.full_name || 'Customer'}</Text>
              <Text style={styles.contactMeta}>{order.delivery_address}</Text>
            </View>
            <TouchableOpacity style={styles.contactButton} onPress={() => {}}>
              <Text style={styles.contactButtonText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {order.delivery ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Driver</Text>
            <View style={styles.contactRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{order.delivery.driver?.user_id ? `Driver ${order.delivery.driver.user_id.slice(-4)}` : 'Assigned Driver'}</Text>
                <Text style={styles.contactMeta}>{order.delivery.driver?.vehicle_type || '—'}</Text>
              </View>
              <TouchableOpacity style={styles.contactButton} onPress={() => {}}>
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.addressText}>{order.delivery_address}</Text>
          {order.delivery_instructions ? <Text style={styles.addressMeta}>{order.delivery_instructions}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {timeline.length === 0 ? (
            <Text style={styles.addressMeta}>No events yet.</Text>
          ) : (
            timeline.map((event, idx) => (
              <TimelineItem
                key={`${event.event_type}-${event.created_at}-${idx}`}
                title={statusLabel(event.event_type)}
                subtitle={event.event_note || undefined}
                time={new Date(event.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                completed
                style={{ marginBottom: idx === timeline.length - 1 ? 0 : theme.spacing.sm }}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Accepted';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready for Pickup';
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const theme = useRestaurantTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
      <Text style={{ ...theme.typography.body, color: theme.colors.secondaryText }}>{label}</Text>
      <Text style={{ ...theme.typography.body, fontFamily: bold ? 'Inter-SemiBold' : 'Inter-Regular' }}>{value}</Text>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const isCompact = theme.device.isSmallScreen;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    backText: { ...theme.typography.subhead, color: theme.colors.accent },
    headerTitle: { ...theme.typography.title2 },
    placeholder: { width: 48 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm },
    loadingText: { ...theme.typography.body, color: theme.colors.secondaryText },
    errorText: { ...theme.typography.body, color: theme.colors.status.error, textAlign: 'center', marginTop: theme.spacing.lg },
    statusBanner: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      ...theme.shadows.card,
    },
    statusLabel: { ...theme.typography.subhead },
    paymentPill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
    },
    paymentText: { ...theme.typography.caption, fontFamily: 'Inter-SemiBold' },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      ...theme.shadows.card,
    },
    sectionTitle: { ...theme.typography.subhead, marginBottom: theme.spacing.sm },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    itemName: { ...theme.typography.body, flex: 1, marginRight: theme.spacing.sm },
    itemQty: { ...theme.typography.caption, color: theme.colors.secondaryText },
    itemPrice: { ...theme.typography.body },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderMuted,
      marginVertical: theme.spacing.sm,
    },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    contactName: { ...theme.typography.body },
    contactMeta: { ...theme.typography.caption, color: theme.colors.secondaryText },
    contactButton: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    contactButtonText: { ...theme.typography.buttonSmall },
    addressText: { ...theme.typography.body },
    addressMeta: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: theme.spacing.xs },
  });
}
