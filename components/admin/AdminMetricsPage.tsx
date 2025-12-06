import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { styles } from '@/styles/adminMetrics';
import ActionBanner from '@/components/admin/ActionBanner';
import { AdminToast } from '@/components/admin/AdminToast';
import LicenseReviewList from '@/components/admin/LicenseReviewList';
import PaymentReviewList from '@/components/admin/PaymentReviewList';
import PhotoReviewList from '@/components/admin/PhotoReviewList';
import HeroStats from '@/components/admin/HeroStats';
import AlertsSnapshot from '@/components/admin/AlertsSnapshot';
import ApprovalQueueSummary from '@/components/admin/ApprovalQueueSummary';
import PayoutBacklog from '@/components/admin/PayoutBacklog';
import AdminGrid from '@/components/admin/AdminGrid';
import type { AdminMetricsCoordinatorState } from '@/hooks/useAdminMetricsCoordinator';

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
    <View style={styles.scrollContent}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Admin Console</Text>
          <Text style={styles.subheader}>{userEmail} • Approvals only</Text>
        </View>
      </View>

      {actionBanner && <ActionBanner text={actionBanner.text} tone={actionBanner.tone} undo={actionBanner.undo} />}
      <AdminToast message={status} tone="info" />

      <HeroStats
        approvalsCount={approvalsCount}
        payoutsCount={payoutsCount}
        platformNet={platformFees}
        refreshing={refreshingAll}
        onRefreshAll={refreshAll}
        onPressSection={(key) => {
          if (key === 'payments') router.replace('/admin/reviews');
          if (key === 'payouts') router.replace('/admin/payouts');
        }}
      />

      <AdminGrid minColumnWidth={320} gap={12}>
        <ApprovalQueueSummary
          approvalsCount={approvalsCount}
          payoutsCount={payoutsCount}
          orderIssues={orderIssues?.length ?? 0}
          deliveryIssues={deliveryIssues?.length ?? 0}
        />
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Money Overview</Text>
            <Text style={styles.metaRow}>View-only snapshot</Text>
          </View>
          <View style={styles.feeGrid}>
            <View style={styles.feeCell}>
              <Text style={styles.feeLabel}>Gross revenue (before cuts)</Text>
              <Text style={styles.feeValue}>${grossRevenue.toFixed(2)}</Text>
            </View>
            <View style={styles.feeCell}>
              <Text style={styles.feeLabel}>Platform fees collected</Text>
              <Text style={styles.feeValue}>${platformFees.toFixed(2)}</Text>
            </View>
            <View style={styles.feeCell}>
              <Text style={styles.feeLabel}>Restaurant payouts remaining</Text>
              <Text style={styles.feeValue}>${restaurantOutstanding.toFixed(2)}</Text>
            </View>
            <View style={styles.feeCell}>
              <Text style={styles.feeLabel}>Driver payouts remaining</Text>
              <Text style={styles.feeValue}>${driverOutstanding.toFixed(2)}</Text>
            </View>
          </View>
          <Text style={styles.metaRow}>Queues: {approvalsCount} approvals • {payoutsCount} payouts</Text>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ops Alerts</Text>
          <AlertsSnapshot snapshot={opsAlerts ?? null} />
        </View>
        <PayoutBacklog restaurantPayables={restaurantPayables} driverPayables={driverPayables} loading={payoutLoading} />
      </AdminGrid>

      <Text style={styles.header}>Payments needing approval</Text>
      <PaymentReviewList
        items={reviewQueue}
        loading={paymentLoading}
        error={paymentError}
        mismatch={mismatch}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Driver license approvals</Text>
        <LicenseReviewList
          items={licenseQueue}
          loading={licenseLoading}
          statusText={null}
          onApprove={driverId => handleLicenseDecision(driverId, 'approved')}
          onReject={(driverId, reason) => handleLicenseDecision(driverId, 'rejected', reason)}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Menu photo approvals</Text>
        <PhotoReviewList
          items={photoQueue}
          loading={photoLoading}
          statusText={null}
          onApprove={menuItemId => handleMenuPhotoDecision(menuItemId, 'approved')}
          onReject={(menuItemId, reason) => handleMenuPhotoDecision(menuItemId, 'rejected', reason)}
        />
      </View>

      <Text style={styles.header}>Outstanding restaurant payouts</Text>
      {payoutLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#FF6B35" />
        </View>
      ) : (
        restaurantPayables.map(payable => (
          <View key={payable.order_id} style={styles.card}>
            <Text style={styles.title}>{payable.restaurant_name || payable.restaurant_id}</Text>
            <Text style={styles.metaRow}>Order: {payable.order_id}</Text>
            <Text style={styles.row}>Contact: {payable.contact_name || '—'} • {payable.contact_email || '—'} • {payable.contact_phone || '—'}</Text>
            <Text style={styles.row}>Instapay: {payable.payout_handle || '—'} ({payable.payout_method || 'instapay'})</Text>
            <Text style={styles.row}>Amount due: ${(Number(payable.restaurant_net ?? 0) + Number(payable.tip_amount ?? 0)).toFixed(2)}</Text>
            {payable.restaurant_payout_last_error && <Text style={[styles.row, styles.warningText]}>Last error: {payable.restaurant_payout_last_error}</Text>}
          </View>
        ))
      )}

      <Text style={styles.header}>Outstanding driver payouts</Text>
      {payoutLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#FF6B35" />
        </View>
      ) : (
        driverPayables.map(payable => (
          <View key={payable.order_id} style={styles.card}>
            <Text style={styles.title}>{payable.driver_name || payable.driver_id}</Text>
            <Text style={styles.metaRow}>Order: {payable.order_id}</Text>
            <Text style={styles.row}>Contact: {payable.driver_email || '—'} • {payable.driver_phone || '—'}</Text>
            <Text style={styles.row}>Instapay: {payable.payout_handle || payable.driver_payout_handle || '—'} ({payable.payout_method || 'instapay'})</Text>
            <Text style={styles.row}>Amount due: ${Number(payable.driver_payable ?? 0).toFixed(2)}</Text>
            {payable.driver_payout_last_error && <Text style={[styles.row, styles.warningText]}>Last error: {payable.driver_payout_last_error}</Text>}
          </View>
        ))
      )}
    </View>
  );
}
