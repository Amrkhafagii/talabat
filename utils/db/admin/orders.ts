import { supabase } from '../../supabase';

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
  delivery?: any;
  delivery_events?: any[];
  state_issue?: string | null;
};

export async function getOrderAdminDetail(orderId: string): Promise<OrderAdminDetail | null> {
  const { data, error } = await supabase.rpc('get_order_admin_detail', { p_order_id: orderId });
  if (error) {
    console.warn('get_order_admin_detail error', error);
    return null;
  }
  return (data as OrderAdminDetail) ?? null;
}

export type OrderStateIssue = {
  id: string;
  status: string;
  payment_status: string;
  wallet_capture_status: string | null;
  receipt_url: string | null;
  restaurant_id: string | null;
  user_id: string | null;
  created_at: string | null;
  issue: string;
};

export type DeliveryStateIssue = {
  id: string;
  order_id: string;
  driver_id: string | null;
  status: string;
  driver_earnings: number | null;
  updated_at: string | null;
  documents_verified: boolean | null;
  license_document_status: string | null;
  issue: string;
};

export async function listOrderStateIssues(): Promise<OrderStateIssue[]> {
  const { data, error } = await supabase.rpc('list_order_state_issues');
  if (error) {
    console.warn('list_order_state_issues error', error);
    return [];
  }
  return data || [];
}

export async function listDeliveryStateIssues(): Promise<DeliveryStateIssue[]> {
  const { data, error } = await supabase.rpc('list_delivery_state_issues');
  if (error) {
    console.warn('list_delivery_state_issues error', error);
    return [];
  }
  return data || [];
}
