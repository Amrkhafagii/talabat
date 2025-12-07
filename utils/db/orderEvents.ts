import { supabase } from '../supabase';

export async function logOrderEvent(orderId: string, eventType: string, eventNote?: string, createdBy?: string): Promise<boolean> {
  const { error } = await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: eventType,
    event_note: eventNote ?? null,
    created_by: createdBy ?? null,
  });
  if (error) {
    console.error('Error logging order event', error);
    return false;
  }
  return true;
}

export type OrderTimelineEvent = {
  event_type: string;
  event_note: string | null;
  created_at: string;
  created_by: string | null;
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
