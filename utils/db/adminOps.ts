import { supabase } from '../supabase';
import { logAudit } from './trustedArrival';

export type PaymentReviewItem = {
  id: string;
  user_id: string | null;
  restaurant_id: string | null;
  total_charged: number | null;
  total: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  tip_amount: number | null;
  delivery_fee: number | null;
  platform_fee: number | null;
  restaurant_net: number | null;
  customer_payment_txn_id: string | null;
  receipt_url: string | null;
  created_at: string;
};

export async function getPaymentReviewQueue(): Promise<PaymentReviewItem[]> {
  const { data, error } = await supabase.rpc('list_payment_review_queue');
  if (error) {
    console.warn('list_payment_review_queue error', error);
    return [];
  }
  return data || [];
}

export async function approvePaymentReview(orderId: string): Promise<boolean> {
  const { error } = await supabase.rpc('approve_payment_review', { p_order_id: orderId });
  if (error) return false;
  await logAudit('payment_review_approved', 'orders', orderId);
  return true;
}

export async function rejectPaymentReview(orderId: string, reason?: string): Promise<boolean> {
  const { error } = await supabase.rpc('reject_payment_review', { p_order_id: orderId, p_reason: reason ?? 'rejected' });
  if (error) return false;
  await logAudit('payment_review_rejected', 'orders', orderId, { reason });
  return true;
}

export type PaymentProofResult = {
  status: string;
  auto_verified: boolean;
  amount_diff: number;
  expected_amount: number;
  reported_amount: number;
  txn_id_duplicate: boolean;
  mismatch_reasons: string[];
};

export async function submitPaymentProofManual(params: {
  orderId: string;
  txnId: string;
  amount: number;
  receiptUrl?: string;
  paidAt?: string;
}): Promise<{ ok: boolean; result?: PaymentProofResult; error?: string }> {
  const { orderId, txnId, amount, receiptUrl, paidAt } = params;
  const { data, error } = await supabase.rpc('submit_payment_proof', {
    p_order_id: orderId,
    p_txn_id: txnId,
    p_reported_amount: amount,
    p_receipt_url: receiptUrl ?? null,
    p_paid_at: paidAt ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, result: data as PaymentProofResult };
}

export type RestaurantPayable = {
  order_id: string;
  restaurant_id: string;
  restaurant_net: number | null;
  tip_amount: number | null;
  payment_status: string | null;
  restaurant_payout_status: string | null;
  restaurant_payout_last_error: string | null;
  payout_attempts: number | null;
  payout_ref: string | null;
  restaurant_payout_next_retry_at?: string | null;
  created_at: string;
};

export type RestaurantPayableFilters = {
  status?: string | null;
  restaurantId?: string | null;
  payoutRef?: string | null;
  createdAfter?: string | null;
  createdBefore?: string | null;
};

export async function getRestaurantPayablesPending(filters?: RestaurantPayableFilters): Promise<RestaurantPayable[]> {
  const { data, error } = await supabase.rpc('list_restaurant_payables', {
    p_status: filters?.status ?? null,
    p_restaurant_id: filters?.restaurantId ?? null,
    p_ref: filters?.payoutRef ?? null,
    p_created_after: filters?.createdAfter ?? null,
    p_created_before: filters?.createdBefore ?? null,
  });
  if (error) {
    console.warn('list_restaurant_payables error', error);
    return [];
  }
  return data || [];
}

export type DriverPayable = {
  order_id: string;
  driver_id: string | null;
  driver_payout_handle: string | null;
  delivery_fee: number | null;
  tip_amount: number | null;
  payment_status: string | null;
  driver_payout_status: string | null;
  driver_payout_last_error: string | null;
  payout_attempts: number | null;
  payout_ref: string | null;
  driver_payout_next_retry_at?: string | null;
  created_at: string;
};

export type DriverPayableFilters = {
  status?: string | null;
  driverId?: string | null;
  payoutRef?: string | null;
  createdAfter?: string | null;
  createdBefore?: string | null;
};

export async function getDriverPayablesPending(filters?: DriverPayableFilters): Promise<DriverPayable[]> {
  const { data, error } = await supabase.rpc('list_driver_payables', {
    p_status: filters?.status ?? null,
    p_driver_id: filters?.driverId ?? null,
    p_ref: filters?.payoutRef ?? null,
    p_created_after: filters?.createdAfter ?? null,
    p_created_before: filters?.createdBefore ?? null,
  });
  if (error) {
    console.warn('list_driver_payables error', error);
    return [];
  }
  return data || [];
}

export type RestaurantLedgerItem = {
  order_id: string;
  payment_status: string;
  subtotal?: number | null;
  tax_amount?: number | null;
  restaurant_net: number | null;
  platform_fee: number | null;
  delivery_fee: number | null;
  tip_amount: number | null;
  restaurant_payout_last_error?: string | null;
  driver_payout_last_error?: string | null;
  driver_payout_status: string | null;
  driver_payout_ref: string | null;
  restaurant_payout_status: string | null;
  restaurant_payout_ref: string | null;
  total_charged: number | null;
  receipt_url: string | null;
  created_at: string;
};

export async function getRestaurantLedger(restaurantId: string): Promise<RestaurantLedgerItem[]> {
  const { data, error } = await supabase.rpc('list_restaurant_payment_visibility', { p_restaurant_id: restaurantId });
  if (error) {
    console.warn('list_restaurant_payment_visibility error', error);
    return [];
  }
  return data || [];
}

export type DriverPayoutVisibility = {
  order_id: string;
  driver_id: string;
  delivery_fee: number | null;
  tip_amount: number | null;
  payment_status: string | null;
  driver_payout_status: string | null;
  driver_payout_ref: string | null;
  driver_payout_last_error: string | null;
  created_at: string;
};

export async function getDriverPayoutVisibility(driverId: string): Promise<DriverPayoutVisibility[]> {
  const { data, error } = await supabase.rpc('list_driver_payout_visibility', { p_driver_id: driverId });
  if (error) {
    console.warn('list_driver_payout_visibility error', error);
    return [];
  }
  return data || [];
}

export type OrderAdminDetail = {
  order_id: string;
  user_id: string;
  restaurant_id: string;
  payment_status: string;
  restaurant_payout_status: string | null;
  driver_payout_status: string | null;
  restaurant_payout_ref: string | null;
  driver_payout_ref: string | null;
  restaurant_payout_attempts: number | null;
  driver_payout_attempts: number | null;
  restaurant_payout_last_error: string | null;
  driver_payout_last_error: string | null;
  payment_review_notes: string | null;
  ledger: Record<string, any>;
  receipt_url: string | null;
  customer_payment_txn_id: string | null;
  events: any[];
  audits: any[];
  created_at: string;
  updated_at: string;
};

export async function getOrderAdminDetail(orderId: string): Promise<OrderAdminDetail | null> {
  const { data, error } = await supabase.rpc('get_order_admin_detail', { p_order_id: orderId });
  if (error) {
    console.warn('get_order_admin_detail error', error);
    return null;
  }
  return (data as OrderAdminDetail) ?? null;
}

export type OpsAlertsSnapshot = {
  pending_beyond_sla: { restaurant: number; driver: number; threshold_hours: number };
  payout_failure_rate: { restaurant: number; driver: number; cap: number };
  payment_review_backlog: number;
  payment_proof_rate_limited_24h: number;
  reconciliation_unmatched_48h: number;
  reconciliation_mismatches_by_restaurant: Record<string, number>;
};

export async function getOpsAlertsSnapshot(
  pendingHours = 24,
  failureRateCap = 0.05
): Promise<OpsAlertsSnapshot | null> {
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

export async function markRestaurantPayoutManual(params: {
  orderId: string;
  payoutRef?: string;
  success: boolean;
  errorNote?: string;
}): Promise<{ ok: boolean; status?: string; error?: string }> {
  const idem = `manual_rest_${Date.now()}`;
  const { data, error } = await supabase.rpc('finalize_restaurant_payout', {
    p_order_id: params.orderId,
    p_idempotency_key: idem,
    p_success: params.success,
    p_payout_ref: params.payoutRef ?? idem,
    p_error: params.errorNote ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, status: data as string };
}

export async function markDriverPayoutManual(params: {
  orderId: string;
  driverId: string;
  payoutRef?: string;
  success: boolean;
  errorNote?: string;
}): Promise<{ ok: boolean; status?: string; error?: string }> {
  const idem = `manual_drv_${Date.now()}`;
  const payoutRef = params.payoutRef ?? idem;
  const initiate = await supabase.rpc('initiate_driver_payout', {
    p_order_id: params.orderId,
    p_driver_id: params.driverId,
    p_idempotency_key: idem,
    p_payout_ref: payoutRef,
  });
  if (initiate.error) return { ok: false, error: initiate.error.message };

  const finalize = await supabase.rpc('finalize_driver_payout', {
    p_order_id: params.orderId,
    p_idempotency_key: idem,
    p_success: params.success,
    p_payout_ref: payoutRef,
    p_error: params.errorNote ?? null,
  });

  if (finalize.error) return { ok: false, error: finalize.error.message };
  return { ok: true, status: finalize.data as string };
}

export async function retryRestaurantPayout(orderId: string, payoutRef?: string): Promise<{ ok: boolean; status?: string; error?: string }> {
  const idem = `retry_rest_${Date.now()}`;
  const { error } = await supabase.rpc('initiate_restaurant_payout', {
    p_order_id: orderId,
    p_idempotency_key: idem,
    p_payout_ref: payoutRef ?? idem,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, status: 'initiated' };
}

export async function retryDriverPayout(params: { orderId: string; driverId: string; payoutRef?: string }): Promise<{ ok: boolean; status?: string; error?: string }> {
  const idem = `retry_drv_${Date.now()}`;
  const payoutRef = params.payoutRef ?? idem;
  const init = await supabase.rpc('initiate_driver_payout', {
    p_order_id: params.orderId,
    p_driver_id: params.driverId,
    p_idempotency_key: idem,
    p_payout_ref: payoutRef,
  });
  if (init.error) return { ok: false, error: init.error.message };
  return { ok: true, status: 'initiated' };
}

export async function retryDuePayouts(): Promise<{ restRetried: number; driverRetried: number; errors: string[] }> {
  const errors: string[] = [];
  let restRetried = 0;
  let driverRetried = 0;
  const now = Date.now();

  const restPayables = await getRestaurantPayablesPending({ status: 'failed' });
  for (const p of restPayables) {
    if (p.restaurant_payout_next_retry_at && Date.parse(p.restaurant_payout_next_retry_at) > now) continue;
    const res = await retryRestaurantPayout(p.order_id, p.payout_ref ?? undefined);
    if (res.ok) restRetried += 1;
    else errors.push(res.error ?? 'restaurant_retry_failed');
  }

  const drvPayables = await getDriverPayablesPending({ status: 'failed' });
  for (const p of drvPayables) {
    if (p.driver_payout_next_retry_at && Date.parse(p.driver_payout_next_retry_at) > now) continue;
    if (!p.driver_id) {
      errors.push(`missing_driver:${p.order_id}`);
      continue;
    }
    const res = await retryDriverPayout({ orderId: p.order_id, driverId: p.driver_id, payoutRef: p.payout_ref ?? undefined });
    if (res.ok) driverRetried += 1;
    else errors.push(res.error ?? 'driver_retry_failed');
  }

  return { restRetried, driverRetried, errors };
}

export type SettlementRow = {
  txn_id?: string;
  payment_ref?: string;
  amount: number;
  settlement_date?: string;
  channel?: string;
};

export async function reconcileSettlementImport(rows: SettlementRow[]): Promise<
  { ok: true; result: any[] } | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc('reconcile_settlement_import', { p_rows: rows as any });
  if (error) {
    console.warn('reconcile_settlement_import error', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, result: (data as any[]) ?? [] };
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

export type SettlementReport = {
  platform_fee_collected: number;
  delivery_fee_pass_through: number;
  tip_pass_through: number;
  gross_collected: number;
  refunds_voids: number;
  net_collected: number;
  restaurant_payable_due: number;
  restaurant_payable_paid: number;
  restaurant_payable_failed: number;
  driver_payable_due: number;
  driver_payable_paid: number;
  driver_payable_failed: number;
};

export async function getSettlementReport(days = 1): Promise<SettlementReport | null> {
  const { data, error } = await supabase.rpc('daily_settlement_report', { p_days: days });
  if (error) {
    console.warn('daily_settlement_report error', error);
    return null;
  }
  if (!data || data.length === 0) return null;
  return data[0] as SettlementReport;
}

export type AgingPayable = {
  order_id: string;
  payable_type: 'restaurant' | 'driver';
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  age_hours: number;
};

export async function getAgingPayables(hours = 24): Promise<AgingPayable[]> {
  const { data, error } = await supabase.rpc('list_aging_payables', { p_hours: hours });
  if (error) {
    console.warn('list_aging_payables error', error);
    return [];
  }
  return (data as AgingPayable[]) ?? [];
}
