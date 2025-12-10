import { supabase } from '../supabase';

export async function logOrderEvent(orderId: string, eventType: string, eventNote?: string, createdBy?: string): Promise<boolean> {
  const payload = {
    order_id: orderId,
    event_type: eventType,
    event_note: eventNote ?? null,
    created_by: createdBy ?? null,
  };

  const { error } = await supabase.from('order_events').insert(payload);
  if (!error) return true;

  // If the provided user is missing in the users table, retry without FK to avoid hard failure.
  if (error.code === '23503' && createdBy) {
    const { error: retryError } = await supabase.from('order_events').insert({ ...payload, created_by: null });
    if (!retryError) {
      console.warn('order_events: missing created_by user, logged event without user', { createdBy, orderId, eventType });
      return true;
    }
  }

  console.error('Error logging order event', error);
  return false;
}

export type OrderTimelineEvent = {
  event_type: string;
  event_note: string | null;
  created_at: string;
  created_by: string | null;
  eta_confidence_low?: string | null;
  eta_confidence_high?: string | null;
  eta_promised?: string | null;
  source?: 'status' | 'event';
};

export async function getOrderTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
  const { data, error } = await supabase
    .from('order_status_timeline')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching order timeline', error);
    return [];
  }

  return (data || []) as OrderTimelineEvent[];
}
