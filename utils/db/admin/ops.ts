import { supabase } from '../../supabase';

export type OpsAlertsSnapshot = {
  pending_beyond_sla: { restaurant: number; driver: number; threshold_hours: number };
  payout_failure_rate: { restaurant: number; driver: number; cap: number };
  payment_review_backlog: number;
  payment_proof_rate_limited_24h: number;
  reconciliation_unmatched_48h: number;
  reconciliation_mismatches_by_restaurant: Record<string, number>;
};

export async function getOpsAlertsSnapshot(pendingHours = 24, failureRateCap = 0.05): Promise<OpsAlertsSnapshot | null> {
  const { data, error } = await supabase.rpc('get_ops_alerts_snapshot', {
    p_pending_hours: pendingHours,
    p_failure_rate_cap: failureRateCap,
  });
  if (error) {
    console.warn('get_ops_alerts_snapshot error', error);
    return null;
  }
  return (data as OpsAlertsSnapshot) ?? null;
}

export type AdminQueueCounts = {
  payments: number;
  licenses: number;
  photos: number;
  restaurant_payouts: number;
  driver_payouts: number;
};

export async function getAdminQueueCounts(): Promise<AdminQueueCounts | null> {
  const { data, error } = await supabase.rpc('admin_queue_counts');
  if (error) {
    console.warn('admin_queue_counts error', error);
    return null;
  }
  return (data as AdminQueueCounts) ?? null;
}

export type AdminKpiOverview = {
  uptime: number;
  api_success: number;
  active_sessions: number;
  total_users: number;
  new_signups: number;
  daily_revenue: number;
  refund_requests: number;
  uptime_delta?: number;
  api_success_delta?: number;
  active_sessions_delta?: number;
  revenue_delta?: number;
};

export async function getAdminKpiOverview(): Promise<AdminKpiOverview | null> {
  const { data, error } = await supabase.rpc('admin_kpi_overview');
  if (error) {
    console.warn('admin_kpi_overview error', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as AdminKpiOverview) ?? null;
}

export type OpsPlaybook = Record<string, { steps: string[] }>;

export async function getOpsPlaybook(): Promise<OpsPlaybook | null> {
  const { data, error } = await supabase.rpc('get_ops_playbook');
  if (error) {
    console.warn('get_ops_playbook error', error);
    return null;
  }
  return (data as OpsPlaybook) ?? null;
}
