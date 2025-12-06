import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { styles } from '@/styles/adminMetrics';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import ActionBanner from '@/components/admin/ActionBanner';
import { AdminToast } from '@/components/admin/AdminToast';
import { AdminState } from '@/components/admin/AdminState';
import LicenseReviewList from '@/components/admin/LicenseReviewList';
import PaymentReviewList from '@/components/admin/PaymentReviewList';
import PhotoReviewList from '@/components/admin/PhotoReviewList';
import HeroStats from '@/components/admin/HeroStats';
import AlertsSnapshot from '@/components/admin/AlertsSnapshot';
import ApprovalQueueSummary from '@/components/admin/ApprovalQueueSummary';
import PayoutBacklog from '@/components/admin/PayoutBacklog';
import AdminGrid from '@/components/admin/AdminGrid';
import type { AdminMetricsCoordinatorState } from '@/hooks/useAdminMetricsCoordinator';
import { IOSMetricTile } from '@/components/ios/IOSMetricTile';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSQueueRow } from '@/components/ios/IOSQueueRow';

type AdminMetricsPageProps = {
  userEmail: string;
  onSignOut: () => void;
} & AdminMetricsCoordinatorState;

export default function AdminMetricsPage({ userEmail, onSignOut, ...vm }: AdminMetricsPageProps) {
  const {
    actionBanner,
    approvalsCount,
    orderIssues,
    deliveryIssues,
    driverOutstanding,
    driverPayables,
    grossRevenue,
    paymentError,
    paymentLoading,
    photoLoading,
    photoQueue,
    payoutLoading,
    platformFees,
    payoutsCount,
    refreshAll,
    refreshingAll,
    restaurantOutstanding,
    restaurantPayables,
    reviewQueue,
    licenseQueue,
    licenseLoading,
    status,
    handleApprove,
    handleReject,
    handleLicenseDecision,
    handleMenuPhotoDecision,
  mismatch,
  opsAlerts,
} = vm;

  return (
    <View style={[styles.scrollContent, hero.wrapper]}>
      {actionBanner && <ActionBanner text={actionBanner.text} tone={actionBanner.tone} undo={actionBanner.undo} />}
      <AdminToast message={status} tone="info" />

      <View style={hero.card}>
        <View style={hero.headerRow}>
          <Text style={hero.title}>Admin Dashboard (Overview)</Text>
          <Text style={hero.subtitle}>Operational Health & Review</Text>
        </View>
        <AdminGrid minColumnWidth={220} gap={iosSpacing.sm}>
          <IOSMetricTile label="Approvals" value={`${approvalsCount}`} helper="Pending" deltaLabel="+" deltaTone="info" />
          <IOSMetricTile label="Payouts" value={`${payoutsCount}`} helper="Pending" deltaLabel="+" deltaTone="info" />
          <IOSMetricTile label="Platform fees" value={`$${platformFees.toFixed(2)}`} helper="Last day" deltaLabel="↑" deltaTone="success" />
        </AdminGrid>
      </View>

      <AdminGrid minColumnWidth={300} gap={12}>
        <IOSMetricTile
          label="Total revenue"
          value={`$${grossRevenue.toFixed(2)}`}
          helper={`Platform net: $${platformFees.toFixed(2)}`}
          deltaLabel="Trending"
          deltaTone="info"
        />
        <IOSMetricTile
          label="Restaurant payouts due"
          value={`$${restaurantOutstanding.toFixed(2)}`}
          helper={`Driver payouts due: $${driverOutstanding.toFixed(2)}`}
          deltaLabel="Due"
          deltaTone="warning"
        />
        <IOSMetricTile
          label="Queues"
          value={`${approvalsCount} approvals`}
          helper={`${payoutsCount} payouts pending`}
          deltaLabel="Live"
          deltaTone="success"
        />
      </AdminGrid>

      <AdminGrid minColumnWidth={300} gap={12}>
        <IOSCard padding="md" style={cards.section}>
          <Text style={cards.sectionTitle}>Ops Alerts</Text>
          <AlertsSnapshot snapshot={opsAlerts ?? null} />
        </IOSCard>
        <IOSCard padding="md" style={cards.section}>
          <Text style={cards.sectionTitle}>Backlog</Text>
          <PayoutBacklog restaurantPayables={restaurantPayables} driverPayables={driverPayables} loading={payoutLoading} />
        </IOSCard>
        <IOSCard padding="md" style={cards.section}>
          <Text style={cards.sectionTitle}>Queues</Text>
          <ApprovalQueueSummary
            approvalsCount={approvalsCount}
            payoutsCount={payoutsCount}
            orderIssues={orderIssues?.length ?? 0}
            deliveryIssues={deliveryIssues?.length ?? 0}
          />
        </IOSCard>
      </AdminGrid>

      <View style={cards.section}>
        <View style={cards.sectionHeader}>
          <Text style={cards.sectionTitle}>Payments needing approval</Text>
          <Text style={cards.sectionHelper} onPress={refreshAll}>Refresh</Text>
        </View>
        <PaymentReviewList
          items={reviewQueue}
          loading={paymentLoading}
          error={paymentError}
          mismatch={mismatch}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </View>

      <View style={cards.section}>
        <Text style={cards.sectionTitle}>Driver license approvals</Text>
        <LicenseReviewList
          items={licenseQueue}
          loading={licenseLoading}
          statusText={null}
          onApprove={driverId => handleLicenseDecision(driverId, 'approved')}
          onReject={(driverId, reason) => handleLicenseDecision(driverId, 'rejected', reason)}
        />
      </View>

      <View style={cards.section}>
        <Text style={cards.sectionTitle}>Menu photo approvals</Text>
        <PhotoReviewList
          items={photoQueue}
          loading={photoLoading}
          statusText={null}
          onApprove={menuItemId => handleMenuPhotoDecision(menuItemId, 'approved')}
          onReject={(menuItemId, reason) => handleMenuPhotoDecision(menuItemId, 'rejected', reason)}
        />
      </View>

      <View style={cards.section}>
        <Text style={cards.sectionTitle}>Outstanding restaurant payouts</Text>
        <AdminState
          loading={payoutLoading}
          emptyMessage="No restaurant payouts pending."
          onAction={refreshAll}
          actionLabel="Refresh payouts"
        >
          {restaurantPayables.map(payable => (
            <View key={payable.order_id} style={cards.listCard}>
              <Text style={cards.listTitle}>{payable.restaurant_name || payable.restaurant_id}</Text>
              <Text style={cards.listMeta}>Order: {payable.order_id}</Text>
              <Text style={cards.listMeta}>Amount due: ${(Number(payable.restaurant_net ?? 0) + Number(payable.tip_amount ?? 0)).toFixed(2)}</Text>
              {payable.restaurant_payout_last_error && <Text style={cards.listWarning}>Last error: {payable.restaurant_payout_last_error}</Text>}
            </View>
          ))}
        </AdminState>
      </View>

      <View style={cards.section}>
        <Text style={cards.sectionTitle}>Outstanding driver payouts</Text>
        <AdminState
          loading={payoutLoading}
          emptyMessage="No driver payouts pending."
          onAction={refreshAll}
          actionLabel="Refresh payouts"
        >
          {driverPayables.map(payable => (
            <View key={payable.order_id} style={cards.listCard}>
              <Text style={cards.listTitle}>{payable.driver_name || payable.driver_id}</Text>
              <Text style={cards.listMeta}>Order: {payable.order_id}</Text>
              <Text style={cards.listMeta}>Amount due: ${Number(payable.driver_payable ?? 0).toFixed(2)}</Text>
              {payable.driver_payout_last_error && <Text style={cards.listWarning}>Last error: {payable.driver_payout_last_error}</Text>}
            </View>
          ))}
        </AdminState>
      </View>
    </View>
  );
}

const hero = StyleSheet.create({
  wrapper: { paddingHorizontal: iosSpacing.md },
  card: {
    backgroundColor: '#0B122A',
    borderRadius: iosRadius.xl,
    padding: iosSpacing.lg,
    marginBottom: iosSpacing.lg,
  },
  headerRow: { marginBottom: iosSpacing.md },
  title: { ...iosTypography.title1, color: '#FFFFFF' },
  subtitle: { ...iosTypography.subhead, color: '#E5E7EB' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: iosSpacing.sm },
  metric: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: iosRadius.md,
    padding: iosSpacing.md,
  },
  metricLabel: { ...iosTypography.caption, color: '#E5E7EB' },
  metricValue: { ...iosTypography.title2, color: '#FFFFFF', marginTop: 4 },
  metricHelper: { ...iosTypography.caption, color: '#CBD5E1', marginTop: 2 },
});

const cards = StyleSheet.create({
  tile: {
    backgroundColor: iosColors.surface,
    borderRadius: iosRadius.lg,
    padding: iosSpacing.md,
    gap: 4,
  },
  tileLabel: { ...iosTypography.subhead },
  tileValue: { ...iosTypography.title2 },
  tileHelper: { ...iosTypography.caption, color: iosColors.secondaryText },
  section: {
    backgroundColor: iosColors.surface,
    borderRadius: iosRadius.lg,
    padding: iosSpacing.md,
    marginBottom: iosSpacing.md,
    gap: iosSpacing.sm,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...iosTypography.headline },
  sectionHelper: { ...iosTypography.subhead, color: iosColors.primary },
  listCard: {
    borderWidth: 1,
    borderColor: iosColors.separator,
    borderRadius: iosRadius.md,
    padding: iosSpacing.sm,
    marginBottom: iosSpacing.xs,
  },
  listTitle: { ...iosTypography.subhead },
  listMeta: { ...iosTypography.caption, color: iosColors.secondaryText },
  listWarning: { ...iosTypography.caption, color: iosColors.destructive },
});
