import { useCallback, useState } from 'react';
import { getAgingPayables, getOpsAlertsSnapshot, getSettlementReport, listOrderStateIssues, listDeliveryStateIssues } from '@/utils/database';
import type { AgingPayable, OpsAlertsSnapshot, SettlementReport, OrderStateIssue, DeliveryStateIssue } from '@/utils/db/admin';

type RefreshParams = {
  settlementDays?: number;
  agingHours?: number;
};

export function useAdminReports() {
  const [opsAlerts, setOpsAlerts] = useState<OpsAlertsSnapshot | null>(null);
  const [settlementReport, setSettlementReport] = useState<SettlementReport | null>(null);
  const [agingPayables, setAgingPayables] = useState<AgingPayable[]>([]);
  const [orderIssues, setOrderIssues] = useState<OrderStateIssue[]>([]);
  const [deliveryIssues, setDeliveryIssues] = useState<DeliveryStateIssue[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const loadOpsAlerts = useCallback(async () => {
    try {
      const snapshot = await getOpsAlertsSnapshot();
      setOpsAlerts(snapshot);
    } catch (err) {
      console.error('loadOpsAlerts error', err);
      setOpsAlerts(null);
    }
  }, []);

  const loadSettlement = useCallback(async (days = 1) => {
    try {
      const report = await getSettlementReport(days);
      setSettlementReport(report);
    } catch (err) {
      console.error('loadSettlement error', err);
      setSettlementReport(null);
    }
  }, []);

  const loadAging = useCallback(async (hours = 24) => {
    try {
      const list = await getAgingPayables(hours);
      setAgingPayables(list);
    } catch (err) {
      console.error('loadAging error', err);
      setAgingPayables([]);
    }
  }, []);

  const refreshReports = useCallback(
    async (params?: RefreshParams) => {
      setReportsLoading(true);
      await Promise.all([
        loadOpsAlerts(),
        loadSettlement(params?.settlementDays),
        loadAging(params?.agingHours),
        listOrderStateIssues().then(setOrderIssues),
        listDeliveryStateIssues().then(setDeliveryIssues),
      ]);
      setReportsLoading(false);
    },
    [loadAging, loadOpsAlerts, loadSettlement]
  );

  return {
    opsAlerts,
    settlementReport,
    agingPayables,
    orderIssues,
    deliveryIssues,
    reportsLoading,
    loadOpsAlerts,
    loadSettlement,
    loadAging,
    refreshReports,
  };
}
