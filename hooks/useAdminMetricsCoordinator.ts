import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminOpsData } from './useAdminOpsData';
import { useAdminReports } from './useAdminReports';
import { useActionQueue } from './useActionQueue';
import { approvePaymentReview, rejectPaymentReview, reviewDriverLicense, reviewMenuPhoto } from '@/utils/database';
import { getAdminKpiOverview, getAdminQueueCounts } from '@/utils/db/admin';
import type { AdminKpiOverview, AdminQueueCounts, PaymentReviewItem } from '@/utils/db/admin';
import { expectedPaymentAmount } from '@/utils/adminUi';

export type AdminMetricsCoordinatorState = ReturnType<typeof useAdminMetricsCoordinator>;

export function useAdminMetricsCoordinator() {
  const {
    reviewQueue,
    setReviewQueue,
    licenseQueue,
    setLicenseQueue,
    photoQueue,
    setPhotoQueue,
    restaurantPayables,
    driverPayables,
    paymentLoading,
    licenseLoading,
    photoLoading,
    payoutLoading,
    paymentError,
    loadOpsData,
    payoutBalances,
    walletTx,
    setWalletTx,
  } = useAdminOpsData();
  const { settlementReport, loadSettlement, orderIssues, deliveryIssues, opsAlerts, loadOpsAlerts } = useAdminReports();
  const { actionBanner, queueAction } = useActionQueue();

  const [status, setStatus] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [queueCounts, setQueueCounts] = useState<AdminQueueCounts | null>(null);
  const [kpi, setKpi] = useState<AdminKpiOverview | null>(null);
  const [optimisticApprovals, setOptimisticApprovals] = useState<Set<string>>(new Set());
  const [optimisticPayouts, setOptimisticPayouts] = useState<Set<string>>(new Set());

  const refreshAll = useCallback(async () => {
    setRefreshingAll(true);
    const queueResp = await getAdminQueueCounts().catch(() => null);
    const kpiResp = await getAdminKpiOverview().catch(() => null);
    await Promise.all([
      loadOpsData(),
      loadSettlement(7),
      loadOpsAlerts(),
    ]);
    if (queueResp) setQueueCounts(queueResp);
    if (kpiResp) setKpi(kpiResp);
    setRefreshingAll(false);
  }, [loadOpsData, loadSettlement, loadOpsAlerts]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const mismatch = useCallback((o: PaymentReviewItem) => {
    const reported = o.total_charged ?? o.total ?? 0;
    return Math.abs(reported - expectedPaymentAmount(o)) > 0.01;
  }, []);

  const handleApprove = useCallback(
    (orderId: string) => {
      setStatus(null);
      const item = reviewQueue.find(q => q.id === orderId);
      if (!item) return;
      queueAction({
        kind: 'payment',
        action: 'approve',
        item,
        queuedText: 'Payment approval queued.',
        queuedTone: 'success',
        onDequeue: () => {
          setOptimisticApprovals(prev => new Set(prev).add(orderId));
          setReviewQueue(prev => prev.filter(q => q.id !== orderId));
        },
        onRestore: restored => {
          setOptimisticApprovals(prev => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
          setReviewQueue(prev => [restored, ...prev]);
        },
        onCommit: async () => {
          const ok = await approvePaymentReview(orderId);
          await refreshAll();
          setStatus(ok ? 'Payment approved.' : 'Failed to approve payment.');
          setOptimisticApprovals(prev => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
        },
      });
    },
    [queueAction, refreshAll, reviewQueue, setReviewQueue]
  );

  const handleReject = useCallback(
    (orderId: string, reason = 'mismatch') => {
      setStatus(null);
      const item = reviewQueue.find(q => q.id === orderId);
      if (!item) return;
      queueAction({
        kind: 'payment',
        action: 'reject',
        item,
        queuedText: 'Payment rejection queued.',
        queuedTone: 'warning',
        onDequeue: () => {
          setOptimisticApprovals(prev => new Set(prev).add(orderId));
          setReviewQueue(prev => prev.filter(q => q.id !== orderId));
        },
        onRestore: restored => {
          setOptimisticApprovals(prev => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
          setReviewQueue(prev => [restored, ...prev]);
        },
        onCommit: async () => {
          const ok = await rejectPaymentReview(orderId, reason);
          await refreshAll();
          setStatus(ok ? 'Payment rejected.' : 'Failed to reject payment.');
          setOptimisticApprovals(prev => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
        },
      });
    },
    [queueAction, refreshAll, reviewQueue, setReviewQueue]
  );

  const handleLicenseDecision = useCallback(
    (driverId: string, decision: 'approved' | 'rejected', notes?: string) => {
      setStatus(null);
      const item = licenseQueue.find(l => l.driver_id === driverId);
      if (!item) return;
      queueAction({
        kind: 'license',
        action: decision === 'approved' ? 'approve' : 'reject',
        item,
        queuedText: `License ${decision} queued.`,
        queuedTone: 'success',
        onDequeue: () => setLicenseQueue(prev => prev.filter(d => d.driver_id !== driverId)),
        onRestore: restored => setLicenseQueue(prev => [restored, ...prev]),
        onCommit: async () => {
          const ok = await reviewDriverLicense(driverId, decision, notes);
          setStatus(ok ? `Driver license ${decision}.` : 'Failed to update driver license status.');
        },
      });
    },
    [licenseQueue, queueAction, setLicenseQueue]
  );

  const handleMenuPhotoDecision = useCallback(
    (menuItemId: string, decision: 'approved' | 'rejected', notes?: string) => {
      setStatus(null);
      const item = photoQueue.find(p => p.menu_item_id === menuItemId);
      if (!item) return;
      queueAction({
        kind: 'photo',
        action: decision === 'approved' ? 'approve' : 'reject',
        item,
        queuedText: `Photo ${decision} queued.`,
        queuedTone: 'success',
        onDequeue: () => setPhotoQueue(prev => prev.filter(p => p.menu_item_id !== menuItemId)),
        onRestore: restored => setPhotoQueue(prev => [restored, ...prev]),
        onCommit: async () => {
          const ok = await reviewMenuPhoto(menuItemId, decision, notes);
          setStatus(ok ? `Menu photo ${decision}.` : 'Failed to update menu photo status.');
        },
      });
    },
    [photoQueue, queueAction, setPhotoQueue]
  );

  const restaurantOutstanding = useMemo(
    () => restaurantPayables.reduce((acc, p) => acc + Number(p.restaurant_net ?? 0) + Number(p.tip_amount ?? 0), 0),
    [restaurantPayables]
  );
  const driverOutstanding = useMemo(
    () => driverPayables.reduce((acc, p) => acc + Number(p.driver_payable ?? 0), 0),
    [driverPayables]
  );

  const queueCountsDerived = useMemo(
    () => ({
      payments: reviewQueue.length,
      licenses: licenseQueue.length,
      photos: photoQueue.length,
      restaurantPayouts: restaurantPayables.length,
      driverPayouts: driverPayables.length,
    }),
    [reviewQueue.length, licenseQueue.length, photoQueue.length, restaurantPayables.length, driverPayables.length]
  );

  const payoutsCount = restaurantPayables.length + driverPayables.length;
  const approvalsCount = reviewQueue.length + licenseQueue.length + photoQueue.length;
  const grossRevenue = settlementReport?.gross_collected ?? 0;
  const platformFees = settlementReport?.platform_fee_collected ?? 0;

  return {
    reviewQueue,
    licenseQueue,
    photoQueue,
    restaurantPayables,
    driverPayables,
    paymentLoading,
    licenseLoading,
    photoLoading,
    payoutLoading,
    paymentError,
    settlementReport,
    actionBanner,
    status,
    refreshingAll,
    approvalsCount,
    payoutsCount,
    grossRevenue,
    platformFees,
    restaurantOutstanding,
    driverOutstanding,
    orderIssues,
    deliveryIssues,
    payoutBalances,
    walletTx,
    setWalletTx,
    opsAlerts,
    refreshAll,
    handleApprove,
    handleReject,
    handleLicenseDecision,
    handleMenuPhotoDecision,
    mismatch,
    queueCounts: queueCounts ?? queueCountsDerived,
    kpi,
    optimisticApprovals,
    optimisticPayouts,
  };
}
