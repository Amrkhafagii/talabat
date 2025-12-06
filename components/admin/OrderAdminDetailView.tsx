import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { money } from '@/utils/adminUi';
import type { OrderAdminDetail } from '@/utils/db/adminOps';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSBadge } from '@/components/ios/IOSBadge';
import { IOSPillButton } from '@/components/ios/IOSPillButton';

type Props = {
  order: OrderAdminDetail;
};

type TimelineEvent = { when: string; label: string };

export function OrderAdminDetailView({ order }: Props) {
  const ledger = order.ledger || {};
  const delivery = order.delivery || {};
  const driverId = delivery.driver_id;
  const showPaymentLink = !!(order.receipt_url || order.customer_payment_txn_id || order.payment_status);
  const showRestaurantPayoutLink = !!(order.restaurant_payout_status || order.restaurant_payout_ref);
  const showDriverPayoutLink = !!(driverId || order.driver_payout_status || order.driver_payout_ref);
  const hasActions = showPaymentLink || showRestaurantPayoutLink || showDriverPayoutLink;

  const timeline: TimelineEvent[] = useMemo(() => {
    const base: TimelineEvent[] = [];
    (order.events || []).forEach((e: any) => {
      if (e?.created_at || e?.at) {
        base.push({ when: e.created_at || e.at, label: e.type || JSON.stringify(e) });
      }
    });
    (order.delivery_events || []).forEach((e: any) => {
      if (e?.created_at || e?.at) {
        base.push({ when: e.created_at || e.at, label: e.type || e.status || JSON.stringify(e) });
      }
    });
    return base
      .filter((e) => e.when)
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 10);
  }, [order.events, order.delivery_events]);

  return (
    <IOSCard padding="md" style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Order Case #{order.order_id.slice(-6).toUpperCase()}</Text>
        <IOSBadge label="In Transit" tone="info" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Case Details</Text>
        <Text style={styles.meta}>User: {order.user_id || '—'}</Text>
        <Text style={styles.meta}>Restaurant: {order.restaurant_id || '—'}</Text>
        <Text style={styles.meta}>Status: {order.payment_status || '—'}</Text>
        <Text style={styles.meta}>Issue: {order.state_issue || '—'}</Text>
        <Text style={styles.meta}>Time: {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operational Alerts Snapshot</Text>
        <Text style={styles.meta}>Delivery Status: {delivery.status || '—'}</Text>
        <Text style={styles.meta}>Payment Status: {order.payment_status || '—'}</Text>
      </View>

      {timeline.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {timeline.map((e, idx) => (
            <View key={`${e.label}-${idx}`} style={styles.timelineRow}>
              <Text style={styles.meta}>{new Date(e.when).toLocaleString()}</Text>
              <Text style={styles.meta}>{e.label}</Text>
            </View>
          ))}
        </View>
      )}

      {hasActions && (
        <View style={[styles.section, styles.drawerFooter]}>
          <Text style={styles.sectionTitle}>Next actions</Text>
          <View style={styles.actionRow}>
            {showPaymentLink && (
              <IOSPillButton
                label="View in Reviews"
                onPress={() =>
                  router.push({
                    pathname: '/admin/reviews',
                    params: { tab: 'payments', q: order.order_id },
                  })
                }
                size="sm"
              />
            )}
            {showPaymentLink && (
              <IOSPillButton
                label="Manage Payouts"
                variant="ghost"
                size="sm"
                onPress={() =>
                  router.push({
                    pathname: '/admin/reviews',
                    params: { tab: 'payments', q: `${order.order_id}` },
                  })
                }
              />
            )}
            {showRestaurantPayoutLink && (
              <IOSPillButton
                label="Restaurant payout"
                variant="ghost"
                size="sm"
                onPress={() =>
                  router.push({
                    pathname: '/admin/payouts',
                    params: { section: 'restaurant', focus: order.order_id },
                  })
                }
              />
            )}
            {showDriverPayoutLink && (
              <IOSPillButton
                label="Driver payout"
                variant="ghost"
                size="sm"
                disabled={!driverId}
                onPress={() =>
                  router.push({
                    pathname: '/admin/payouts',
                    params: { section: 'driver', focus: order.order_id },
                  })
                }
              />
            )}
          </View>
        </View>
      )}
    </IOSCard>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: iosRadius.xl },
  title: { ...iosTypography.headline, marginBottom: iosSpacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText, marginTop: 2 },
  warning: { color: iosColors.destructive },
  section: { marginTop: iosSpacing.sm },
  drawerFooter: { borderTopWidth: 1, borderTopColor: iosColors.separator, paddingTop: iosSpacing.xs, marginTop: iosSpacing.md },
  sectionTitle: { ...iosTypography.subhead, marginBottom: iosSpacing.xs },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: iosSpacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: iosSpacing.xs },
  timelineRow: { marginBottom: iosSpacing.xs },
});
