import { supabase } from '../supabase';
import { Delivery } from '@/types/database';
import { updateOrderStatus } from './orders';
import { payoutDriverDelivery } from './wallets';
import { createDeliveryEvent, logAudit } from './trustedArrival';

async function getAvailableDeliveries(): Promise<Delivery[]> {
  const { data, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      order:orders(
        *,
        restaurant:restaurants(*),
        user:users(*),
        order_items(
          *,
          menu_item:menu_items(*)
        )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching available deliveries:', error);
    return [];
  }

  return data || [];
}

async function getDriverDeliveries(driverId: string): Promise<Delivery[]> {
  const { data, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      order:orders(
        *,
        restaurant:restaurants(*),
        user:users(*),
        order_items(
          *,
          menu_item:menu_items(*)
        )
      )
    `)
    .eq('driver_id', driverId)
    .in('status', ['assigned', 'picked_up', 'on_the_way'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching driver deliveries:', error);
    return [];
  }

  return data || [];
}

export async function getDriverDeliveryHistory(
  driverId: string, 
  period: 'today' | 'week' | 'month' | 'all' = 'week'
): Promise<Delivery[]> {
  let query = supabase
    .from('deliveries')
    .select(`
      *,
      order:orders(
        *,
        restaurant:restaurants(*),
        user:users(*),
        order_items(
          *,
          menu_item:menu_items(*)
        )
      )
    `)
    .eq('driver_id', driverId)
    .eq('status', 'delivered');

  // Apply date filters based on period
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
    default:
      // No date filter for 'all'
      break;
  }

  if (period !== 'all' && startDate) {
    query = query.gte('delivered_at', startDate.toISOString());
  }

  query = query.order('delivered_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching driver delivery history:', error);
    return [];
  }

  return data || [];
}

async function acceptDelivery(deliveryId: string, driverId: string): Promise<boolean> {
  const { error } = await supabase
    .from('deliveries')
    .update({
      driver_id: driverId,
      status: 'assigned',
      assigned_at: new Date().toISOString()
    })
    .eq('id', deliveryId)
    .eq('status', 'pending'); // Only accept if still pending

  if (error) {
    console.error('Error accepting delivery:', error);
    return false;
  }

  return true;
}

async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  options?: { tempCheckPassed?: boolean; tempCheckPhotoUrl?: string; handoffConfirmed?: boolean }
): Promise<boolean> {
  const { error } = await supabase.rpc('update_delivery_status_safe', {
    p_delivery_id: deliveryId,
    p_status: status,
    p_temp_check_passed: options?.tempCheckPassed ?? null,
    p_temp_check_photo_url: options?.tempCheckPhotoUrl ?? null,
    p_handoff_confirmed: options?.handoffConfirmed ?? null,
  });

  if (error) {
    console.error('Error updating delivery status safely:', error);
    return false;
  }

  // Update corresponding order status locally for UI coherence
  if (status === 'picked_up') {
    await updateOrderStatusFromDelivery(deliveryId, 'picked_up');
  } else if (status === 'on_the_way') {
    await updateOrderStatusFromDelivery(deliveryId, 'on_the_way');
  } else if (status === 'delivered') {
    await updateOrderStatusFromDelivery(deliveryId, 'delivered');
    await payoutDriverDelivery(deliveryId);
  }

  return true;
}

async function updateOrderStatusFromDelivery(deliveryId: string, status: string) {
  const { data: delivery } = await supabase
    .from('deliveries')
    .select('order_id')
    .eq('id', deliveryId)
    .single();

  if (delivery?.order_id) {
    await updateOrderStatus(delivery.order_id, status);
  }
}

export async function confirmPickupWithTempCheck(deliveryId: string, passed: boolean, photoUrl?: string) {
  return updateDeliveryStatus(deliveryId, 'picked_up', { tempCheckPassed: passed, tempCheckPhotoUrl: photoUrl });
}

export async function confirmDeliveryWithHandoff(deliveryId: string, confirmed: boolean) {
  return updateDeliveryStatus(deliveryId, 'delivered', { handoffConfirmed: confirmed });
}
