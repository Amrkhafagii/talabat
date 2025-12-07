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
import { Text, Alert, View, StyleSheet, TouchableOpacity } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSSegmentedControl } from '@/components/ios/IOSSegmentedControl';
import { IOSPillButton } from '@/components/ios/IOSPillButton';
import { iosColors, iosShadow, iosSpacing, iosTypography, iosRadius } from '@/styles/iosTheme';

export default function AdminPayouts() {
  const params = useLocalSearchParams<{ section?: string; focus?: string }>();
  const { allowed, loading: gateLoading, signOut } = useAdminGate();
  const vm = useAdminMetricsCoordinator();
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const sectionParam = typeof params.section === 'string' ? params.section : undefined;
  const focusSection = sectionParam === 'driver' || sectionParam === 'restaurant' ? sectionParam : undefined;
  const focusOrderId = typeof params.focus === 'string' ? params.focus : null;
  const [queueFilter, setQueueFilter] = useState<'restaurant' | 'driver'>((focusSection as any) || 'restaurant');
  const [showMenu, setShowMenu] = useState(false);

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
    <AdminShell
      title="Payouts"
      onSignOut={signOut}
      headerVariant="ios"
      headerTrailingAction={{ label: 'More', onPress: () => setShowMenu((v) => !v) }}
    >
      <AdminToast message={toast} tone="info" />

      <IOSCard padding="md" style={cardStyles.block}>
        <View style={cardStyles.headerRow}>
          <Text style={cardStyles.title}>Balances</Text>
          <IOSPillButton label="Refresh" variant="ghost" size="sm" onPress={vm.refreshAll} />
        </View>
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
      </IOSCard>

      <IOSCard padding="md" style={cardStyles.block}>
        <View style={cardStyles.headerRow}>
          <Text style={cardStyles.title}>Queues</Text>
          <View style={cardStyles.actionRow}>
            <IOSPillButton label="Process Due Retries" variant="ghost" size="sm" onPress={processDue} />
            <IOSPillButton label="Bulk Refresh" variant="ghost" size="sm" onPress={vm.refreshAll} />
            <TouchableOpacity onPress={() => setShowMenu((v) => !v)} style={cardStyles.moreButton} activeOpacity={0.8}>
              <Text style={cardStyles.moreText}>More</Text>
            </TouchableOpacity>
          </View>
          {showMenu && (
            <View style={cardStyles.menu}>
              <TouchableOpacity onPress={processDue} style={cardStyles.menuItem} activeOpacity={0.8}>
                <Text style={cardStyles.menuText}>Process Due Retries</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={vm.refreshAll} style={cardStyles.menuItem} activeOpacity={0.8}>
                <Text style={cardStyles.menuText}>Bulk Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={{ marginBottom: iosSpacing.sm }}>
          <IOSSegmentedControl
            segments={[
              { key: 'restaurant', label: 'Restaurants', badge: vm.restaurantPayables?.length || 0 },
              { key: 'driver', label: 'Drivers', badge: vm.driverPayables?.length || 0 },
            ]}
            value={queueFilter}
            onChange={(k) => setQueueFilter(k)}
          />
        </View>
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
            focusSection={queueFilter}
            focusOrderId={focusOrderId}
          />
        </AdminState>
      </IOSCard>
    </AdminShell>
  );
}

const cardStyles = StyleSheet.create({
  block: { marginBottom: iosSpacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: iosSpacing.sm },
  title: { ...iosTypography.headline },
  actionRow: { flexDirection: 'row', gap: iosSpacing.xs, alignItems: 'center', paddingVertical: iosSpacing.xs },
  moreButton: {
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xs,
    borderRadius: iosRadius.md,
    backgroundColor: iosColors.surfaceAlt,
    borderWidth: 1,
    borderColor: iosColors.separator,
  },
  moreText: { ...iosTypography.subhead, color: iosColors.secondaryText },
  menu: {
    position: 'absolute',
    top: 36,
    right: 0,
    backgroundColor: iosColors.surface,
    borderRadius: iosRadius.lg,
    borderWidth: 1,
    borderColor: iosColors.separator,
    ...iosShadow.overlay,
  },
  menuItem: { paddingHorizontal: iosSpacing.md, paddingVertical: iosSpacing.sm },
  menuText: { ...iosTypography.subhead },
});
