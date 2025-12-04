import { supabase } from '../supabase';

export interface TrustedArrivalMetrics {
  restaurant_id: string;
  metric_date: string;
  on_time_pct: number | null;
  reroute_rate: number | null;
  substitution_acceptance: number | null;
  credit_cost: number | null;
  affected_orders: number | null;
  csat_affected: number | null;
  csat_baseline: number | null;
}

export async function getTrustedArrivalMetrics(days: 7 | 30 = 7, restaurantId?: string): Promise<TrustedArrivalMetrics[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  let query = supabase
    .from('metrics_trusted_arrival_view')
    .select('*')
    .gte('metric_date', since.toISOString().slice(0, 10))
    .order('metric_date', { ascending: false });

  if (restaurantId) {
    query = query.eq('restaurant_id', restaurantId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching trusted arrival metrics:', error);
    return [];
  }
  return data || [];
}

export async function runPopulateMetrics(): Promise<boolean> {
  const { error } = await supabase.rpc('populate_metrics_trusted_arrival');
  if (error) {
    console.error('Error running populate_metrics_trusted_arrival:', error);
    return false;
  }
  return true;
}

export async function runKillSwitch(): Promise<boolean> {
  const { error } = await supabase.rpc('apply_trusted_kill_switch');
  if (error) {
    console.error('Error running apply_trusted_kill_switch:', error);
    return false;
  }
  return true;
}
