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
import { getOrderStatusToken, getPaymentStatusToken } from '@/styles/statusTokens';
import { formatCurrency, formatOrderTime } from '@/utils/formatters';
import { wp, hp } from '@/styles/responsive';
import { Icon } from '@/components/ui/Icon';

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
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <Text style={styles.errorText}>Order not found</Text>
    </SafeAreaView>
  );
}

  if (loading) {
    return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={theme.tap.hitSlop} style={styles.backButton}>
          <Icon name="ArrowLeft" size={theme.iconSizes.md} color={theme.colors.text} />
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

  const paymentToken = getPaymentStatusToken(order.payment_status, theme);
  const statusToken = getOrderStatusToken(order.status, theme);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={theme.tap.hitSlop} style={styles.backButton}>
          <Icon name="ArrowLeft" size={theme.iconSizes.md} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Order #{order.id.slice(-6).toUpperCase()}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.insets.bottom + theme.spacing.xl }}>
        <View style={styles.statusBanner}>
          <View>
            <Text style={styles.statusTitle}>{getOrderStatusToken(order.status, theme).label}</Text>
            <Text style={styles.statusSubtitle}>Ready for pickup by {formatOrderTime(order.created_at)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusToken.background }]}>
            <Text style={[styles.badgeText, { color: statusToken.color }]}>{statusToken.label}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.order_items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.menu_item?.name || 'Item'}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(Number(item.total_price ?? 0))}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
          <Row label="Delivery" value={formatCurrency(order.delivery_fee)} />
          <Row label="Tax" value={formatCurrency(order.tax_amount)} />
          <Row label="Tip" value={formatCurrency(order.tip_amount)} />
          <Row label="Total" value={formatCurrency(order.total)} bold />
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
                title={getOrderStatusToken(event.event_type, theme).label}
                subtitle={event.event_note || undefined}
                time={new Date(event.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                completed
                style={{ marginBottom: idx === timeline.length - 1 ? 0 : theme.spacing.sm }}
              />
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.bottomCta} activeOpacity={0.9}>
        <Text style={styles.bottomCtaText}>Mark as Ready for Pickup</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
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
  const horizontal = Math.max(theme.spacing.md, wp('5%'));
  const vertical = Math.max(theme.spacing.md, hp('2.5%'));
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: horizontal,
      paddingTop: vertical,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    headerTitle: { ...theme.typography.title2 },
    placeholder: { width: 48 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm },
    loadingText: { ...theme.typography.body, color: theme.colors.secondaryText },
    errorText: { ...theme.typography.body, color: theme.colors.status.error, textAlign: 'center', marginTop: theme.spacing.lg },
    statusBanner: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      ...theme.shadows.card,
    },
    statusTitle: { ...theme.typography.subhead },
    statusSubtitle: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: 2 },
    badge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
    },
    badgeText: { ...theme.typography.caption, fontFamily: 'Inter-SemiBold' },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
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
    bottomCta: {
      backgroundColor: theme.colors.accent,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.cta,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: horizontal,
      marginBottom: theme.insets.bottom + vertical,
      ...theme.shadows.card,
    },
    bottomCtaText: { ...theme.typography.button, color: theme.colors.textInverse },
  });
}
