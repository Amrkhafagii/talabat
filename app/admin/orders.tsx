import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminState } from '@/components/admin/AdminState';
import AlertsSnapshot from '@/components/admin/AlertsSnapshot';
import { AdminToast } from '@/components/admin/AdminToast';
import { useAdminGate } from '@/hooks/useAdminGate';
import { useAdminReports } from '@/hooks/useAdminReports';
import { OrderIssues } from '@/components/admin/OrderIssues';
import { OrderAdminList } from '@/components/admin/OrderAdminList';
import { OrderAdminDetailView } from '@/components/admin/OrderAdminDetailView';
import { getOrderAdminDetail, OrderAdminDetail } from '@/utils/db/adminOps';
import { styles } from '@/styles/adminMetrics';
import OrderFilters from '@/components/admin/OrderFilters';
import AdminGrid from '@/components/admin/AdminGrid';
import { IOSCard } from '@/components/ios/IOSCard';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';

export default function AdminOrders() {
  const { allowed, loading: gateLoading, signOut } = useAdminGate();
  const { opsAlerts, refreshReports, reportsLoading, orderIssues, deliveryIssues } = useAdminReports();
  const [orders, setOrders] = useState<OrderAdminDetail[]>([]);
  const [selected, setSelected] = useState<OrderAdminDetail | null>(null);
  const [search, setSearch] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('any');
  const [paymentFilter, setPaymentFilter] = useState('any');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = async (orderId: string) => {
    if (!orderId) return;
    setLoadingOrder(true);
    setError(null);
    const detail = await getOrderAdminDetail(orderId);
    if (detail) {
      setOrders((prev) => {
        const exists = prev.find(o => o.order_id === detail.order_id);
        if (exists) {
          return prev.map(o => o.order_id === detail.order_id ? detail : o);
        }
        return [detail, ...prev].slice(0, 20);
      });
      setSelected(detail);
    } else {
      setError('Order not found or cannot load details.');
    }
    setLoadingOrder(false);
  };

  useEffect(() => {
    refreshReports();
  }, [refreshReports]);

  if (gateLoading || !allowed) return null;

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = search.trim().toLowerCase();
      if (term) {
        const haystacks = [o.order_id, o.user_id, o.restaurant_id]
          .filter(Boolean)
          .map((h) => h!.toLowerCase());
        if (!haystacks.some((h) => h.includes(term))) return false;
      }
      if (deliveryFilter !== 'any' && o.delivery?.status && o.delivery.status !== deliveryFilter) return false;
      if (deliveryFilter !== 'any' && !o.delivery?.status) return false;
      if (paymentFilter !== 'any' && o.payment_status !== paymentFilter) return false;
      return true;
    });
  }, [orders, paymentFilter, deliveryFilter, search]);

  return (
    <AdminShell title="Orders & Deliveries" onSignOut={signOut} headerVariant="ios">
      <Text style={styles.helperText}>
        Order and delivery health. Alerts highlight issues like unpaid advanced orders or unverified drivers.
      </Text>
      <AdminToast message={error} tone="error" />

      <IOSCard padding="md" style={orderIos.card}>
        <Text style={orderIos.title}>Search & Filters</Text>
        <OrderFilters
          search={search}
          onChangeSearch={setSearch}
          deliveryStatus={deliveryFilter}
          onChangeDeliveryStatus={setDeliveryFilter}
          paymentStatus={paymentFilter}
          onChangePaymentStatus={setPaymentFilter}
          onSubmit={() => loadOrder(search)}
          loading={loadingOrder}
          onQuickReviews={() => router.push({ pathname: '/admin/reviews', params: { q: search } })}
          onQuickPayouts={() => router.push({ pathname: '/admin/payouts', params: { focus: search } })}
        />
      </IOSCard>

      <IOSCard padding="md" style={orderIos.card}>
        <Text style={orderIos.title}>Operational Alerts Snapshot</Text>
        <AdminGrid minColumnWidth={140} gap={iosSpacing.sm}>
          <View style={orderIos.alertTile}>
            <Text style={orderIos.alertNumber}>{Math.max(orderIssues.length, (opsAlerts?.pending_beyond_sla.restaurant ?? 0) + (opsAlerts?.pending_beyond_sla.driver ?? 0))}</Text>
            <Text style={orderIos.alertLabel}>Urgent Order Issues{'\n'}(Delay {opsAlerts?.pending_beyond_sla.threshold_hours ? `> ${opsAlerts.pending_beyond_sla.threshold_hours}h` : ''})</Text>
          </View>
          <View style={orderIos.alertTile}>
            <Text style={[orderIos.alertNumber, { color: iosColors.warning }]}>{opsAlerts?.reconciliation_unmatched_48h ?? 0}</Text>
            <Text style={orderIos.alertLabel}>Pending Payouts{'\n'}(&gt; 48h)</Text>
          </View>
        </AdminGrid>
      </IOSCard>

      <AdminGrid minColumnWidth={320}>
        <IOSCard padding="md" style={[orderIos.card, { minHeight: 320 }]}>
          <Text style={orderIos.title}>Alerts & Issues</Text>
          <AdminState
            loading={reportsLoading}
            emptyMessage="No alerts."
            onAction={refreshReports}
            actionLabel="Refresh alerts"
            hint="If you expect alerts, verify ingest/reporting jobs."
          >
            <AlertsSnapshot snapshot={opsAlerts} useIos />
          </AdminState>
          <OrderIssues
            orders={orderIssues}
            deliveries={deliveryIssues}
            onSelectOrder={(id) => {
              setSearch(id);
              loadOrder(id);
            }}
            onSelectDelivery={(id) => {
              setSearch(id);
              loadOrder(id);
            }}
          />
        </IOSCard>
        <IOSCard padding="md" style={[orderIos.card, { minHeight: 320 }]}>
          <Text style={orderIos.title}>Cases</Text>
          <AdminGrid minColumnWidth={300}>
            <OrderAdminList orders={filteredOrders} onSelect={(id) => loadOrder(id)} />
            {selected && <OrderAdminDetailView order={selected} />}
          </AdminGrid>
        </IOSCard>
      </AdminGrid>

      <View style={{ marginTop: 12 }}>
        <Text style={styles.helperText}>Use the Reviews and Payouts sections to resolve flagged items.</Text>
        <Text style={styles.linkText} onPress={() => refreshReports()}>Refresh alerts</Text>
      </View>
    </AdminShell>
  );
}

const orderIos = StyleSheet.create({
  card: { marginBottom: iosSpacing.md },
  title: { ...iosTypography.headline, marginBottom: iosSpacing.xs },
  alertTile: {
    backgroundColor: iosColors.surfaceAlt,
    borderRadius: iosRadius.lg,
    padding: iosSpacing.md,
  },
  alertNumber: { ...iosTypography.title2, color: iosColors.destructive, textAlign: 'center' },
  alertLabel: { ...iosTypography.caption, color: iosColors.secondaryText, textAlign: 'center', marginTop: iosSpacing.xs },
});
