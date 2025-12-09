import { supabase } from '../../supabase';

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

export type AgingPayable = {
  order_id: string;
  payable_type: 'restaurant' | 'driver';
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  age_hours: number;
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

export async function getAgingPayables(hours = 24): Promise<AgingPayable[]> {
  const { data, error } = await supabase.rpc('list_aging_payables', { p_hours: hours });
  if (error) {
    console.warn('list_aging_payables error', error);
    return [];
  }
  return (data as AgingPayable[]) ?? [];
}
