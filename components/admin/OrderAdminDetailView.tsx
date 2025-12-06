import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { money } from '@/utils/adminUi';
import type { OrderAdminDetail } from '@/utils/db/adminOps';
import { styles as tokens } from '@/styles/adminMetrics';

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
    <View style={styles.card}>
      <Text style={styles.title}>Order {order.order_id.slice(-6).toUpperCase()}</Text>
      <View style={styles.badges}>
        <Badge label={`Payment: ${order.payment_status}`} tone="info" />
        <Badge label={`Receipt: ${order.receipt_url ? 'Yes' : 'No'}`} tone={order.receipt_url ? 'success' : 'warn'} />
        {order.state_issue && <Badge label="Issue" tone="error" />}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment & Payouts</Text>
        <Text style={styles.meta}>Customer txn: {order.customer_payment_txn_id || '—'}</Text>
        <Text style={styles.meta}>Platform fee: {money(ledger.platform_fee || 0)}</Text>
        <Text style={styles.meta}>Restaurant net: {money(ledger.restaurant_net || 0)}</Text>
        <Text style={styles.meta}>Driver earnings: {money(ledger.driver || 0)}</Text>
        <Text style={styles.meta}>Restaurant payout: {order.restaurant_payout_status ?? 'pending'} ({order.restaurant_payout_attempts ?? 0} attempts)</Text>
        <Text style={styles.meta}>Driver payout: {order.driver_payout_status ?? 'pending'} ({order.driver_payout_attempts ?? 0} attempts)</Text>
        {order.restaurant_payout_last_error && <Text style={[styles.meta, styles.warning]}>Restaurant payout error: {order.restaurant_payout_last_error}</Text>}
        {order.driver_payout_last_error && <Text style={[styles.meta, styles.warning]}>Driver payout error: {order.driver_payout_last_error}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery</Text>
        <Text style={styles.meta}>Status: {delivery.status || '—'}</Text>
        <Text style={styles.meta}>Driver: {delivery.driver_id || '—'}</Text>
        <Text style={styles.meta}>Driver verified: {delivery.driver_verified ? 'Yes' : 'No'}</Text>
        <Text style={styles.meta}>Driver earnings: {money(delivery.driver_earnings || 0)}</Text>
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
              <TouchableOpacity
                style={[styles.actionButton, styles.primary]}
                onPress={() =>
                  router.push({
                    pathname: '/admin/reviews',
                    params: { tab: 'payments', q: order.order_id },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={[styles.actionText, styles.actionTextPrimary]}>Open payment review</Text>
              </TouchableOpacity>
            )}
            {showPaymentLink && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  router.push({
                    pathname: '/admin/reviews',
                    params: { tab: 'payments', q: `${order.order_id}` },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={styles.actionText}>Request receipt</Text>
              </TouchableOpacity>
            )}
            {showRestaurantPayoutLink && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  router.push({
                    pathname: '/admin/payouts',
                    params: { section: 'restaurant', focus: order.order_id },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={styles.actionText}>Restaurant payout</Text>
              </TouchableOpacity>
            )}
            {showDriverPayoutLink && (
              <TouchableOpacity
                style={styles.actionButton}
                disabled={!driverId}
                onPress={() =>
                  router.push({
                    pathname: '/admin/payouts',
                    params: { section: 'driver', focus: order.order_id },
                  })
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: !driverId }}
              >
                <Text style={[styles.actionText, !driverId && styles.disabledText]}>
                  Driver payout
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'info' | 'success' | 'warn' | 'error' }) {
  const palette: Record<typeof tone, { bg: string; text: string }> = {
    info: { bg: '#DBEAFE', text: '#1D4ED8' },
    success: { bg: '#ECFDF3', text: '#166534' },
    warn: { bg: '#FEF3C7', text: '#92400E' },
    error: { bg: '#FEE2E2', text: '#B91C1C' },
  };
  const colors = palette[tone] ?? palette.info;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  meta: { color: '#4B5563', marginTop: 2, fontSize: 13 },
  warning: { color: '#B91C1C' },
  section: { marginTop: 12 },
  drawerFooter: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 16 },
  sectionTitle: { fontWeight: '700', color: '#111827', marginBottom: 6 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  actionText: { color: '#111827', fontWeight: '600' },
  disabledText: { color: '#9CA3AF' },
  primary: { backgroundColor: '#0F172A' },
  actionTextPrimary: { color: '#FFFFFF' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  badgeText: { fontWeight: '700', fontSize: 12 },
  timelineRow: { marginBottom: 6 },
});
