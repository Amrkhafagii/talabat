import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
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
    <AdminShell title="Orders & Deliveries" onSignOut={signOut}>
      <Text style={styles.helperText}>
        Order and delivery health. Alerts highlight issues like unpaid advanced orders or unverified drivers.
      </Text>
      <AdminToast message={error} tone="error" />

      <AdminGrid minColumnWidth={520}>
        <View style={[styles.sectionCard, { minHeight: 320 }]}>
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
        <AdminState
          loading={reportsLoading}
          emptyMessage="No alerts."
          onAction={refreshReports}
          actionLabel="Refresh alerts"
          hint="If you expect alerts, verify ingest/reporting jobs."
        >
            <AlertsSnapshot snapshot={opsAlerts} />
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
        </View>
        <View style={[styles.sectionCard, { minHeight: 320 }]}>
          <Text style={styles.sectionTitle}>Cases</Text>
          <AdminGrid minColumnWidth={380}>
            <OrderAdminList orders={filteredOrders} onSelect={(id) => loadOrder(id)} />
            {selected && <OrderAdminDetailView order={selected} />}
          </AdminGrid>
        </View>
      </AdminGrid>

      <View style={{ marginTop: 12 }}>
        <Text style={styles.helperText}>Use the Reviews and Payouts sections to resolve flagged items.</Text>
        <Text style={styles.linkText} onPress={() => refreshReports()}>Refresh alerts</Text>
      </View>
    </AdminShell>
  );
}
