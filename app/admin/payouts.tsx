import React, { useCallback, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import PayoutQueues from '@/components/admin/PayoutQueues';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminState } from '@/components/admin/AdminState';
import { useAdminMetricsCoordinator } from '@/hooks/useAdminMetricsCoordinator';
import { useAdminGate } from '@/hooks/useAdminGate';
import { retryRestaurantPayout, retryDriverPayout, retryDuePayouts, listWalletTransactionsForUser, settleWalletBalance } from '@/utils/db/adminOps';
import { PayoutBalances } from '@/components/admin/PayoutBalances';
import { AdminToast } from '@/components/admin/AdminToast';
import { Text, Alert, View } from 'react-native';
import { styles } from '@/styles/adminMetrics';

export default function AdminPayouts() {
  const params = useLocalSearchParams<{ section?: string; focus?: string }>();
  const { allowed, loading: gateLoading, signOut } = useAdminGate();
  const vm = useAdminMetricsCoordinator();
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const sectionParam = typeof params.section === 'string' ? params.section : undefined;
  const focusSection = sectionParam === 'driver' || sectionParam === 'restaurant' || sectionParam === 'balances' ? sectionParam : undefined;
  const focusOrderId = typeof params.focus === 'string' ? params.focus : null;

  const processDue = useCallback(async () => {
    Alert.alert('Process due retries?', 'This will trigger due retries for restaurant and driver payouts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Process',
        style: 'default',
        onPress: async () => {
          const res = await retryDuePayouts();
          setRetryStatus(`Retried: restaurants ${res.restRetried}, drivers ${res.driverRetried}`);
          vm.refreshAll();
        },
      },
    ]);
  }, [vm]);

  const handleRetryRestaurant = useCallback(async (orderId: string, ref?: string) => {
    Alert.alert('Retry restaurant payout?', orderId.slice(-6).toUpperCase(), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Retry', style: 'default', onPress: async () => { await retryRestaurantPayout(orderId, ref); vm.refreshAll(); } },
    ]);
  }, [vm]);

  const handleRetryDriver = useCallback(async (orderId: string, driverId: string, ref?: string) => {
    Alert.alert('Retry driver payout?', `${orderId.slice(-6).toUpperCase()} • ${driverId}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Retry', style: 'default', onPress: async () => { await retryDriverPayout({ orderId, driverId, payoutRef: ref }); vm.refreshAll(); } },
    ]);
  }, [vm]);

  const handleSettle = useCallback(async (userId: string, walletType: string, handle?: string | null) => {
    const amt = await settleWalletBalance(userId, walletType, handle ?? undefined);
    setToast(amt !== null ? `Settled ${amt}` : 'Settle failed');
    vm.refreshAll();
  }, [vm]);

  const handleViewTx = useCallback(async (userId: string, walletType: string) => {
    const tx = await listWalletTransactionsForUser(userId, walletType);
    vm.setWalletTx((prev) => ({ ...prev, [userId]: tx }));
  }, [vm]);

  if (gateLoading || !allowed) return null;

  return (
    <AdminShell title="Payouts" onSignOut={signOut}>
      <AdminToast message={toast} tone="info" />
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Balances</Text>
        <AdminState
          loading={vm.payoutLoading}
          emptyMessage="No balances."
          onAction={vm.refreshAll}
          actionLabel="Refresh payouts"
          hint="If balances look off, re-run payout visibility fetch."
        >
          <PayoutBalances
            balances={vm.payoutBalances || []}
            walletTx={vm.walletTx}
            onSettle={handleSettle}
            onViewTx={handleViewTx}
          />
        </AdminState>
      </View>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Queues</Text>
        <AdminState
          loading={vm.payoutLoading}
          error={null}
          emptyMessage="No pending payouts."
          onAction={vm.refreshAll}
          actionLabel="Refresh payouts"
          hint="If stuck, try retry due payouts or check payout visibility."
        >
          <PayoutQueues
            restaurantPayables={vm.restaurantPayables}
            driverPayables={vm.driverPayables}
            loading={vm.payoutLoading}
            opsStatus={vm.status}
            retryStatus={retryStatus}
            onRefresh={vm.refreshAll}
            onRetryRestaurant={handleRetryRestaurant}
            onRetryDriver={handleRetryDriver}
            onProcessDue={processDue}
            focusSection={focusSection}
            focusOrderId={focusOrderId}
          />
        </AdminState>
      </View>
    </AdminShell>
  );
}
