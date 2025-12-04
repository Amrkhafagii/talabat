import { supabase } from '../supabase';
import { Order } from '@/types/database';
import { createDeliveryEvent, logAudit } from './trustedArrival';

type RerouteResult = { ok: true; newOrderId: string } | { ok: false; reason: string };

export async function rerouteOrder(orderId: string, backupRestaurantId: string, idempotencyKey?: string): Promise<RerouteResult> {
  const idem = idempotencyKey ?? `reroute_${orderId}_${backupRestaurantId}`;
  // Use server-side transactional reroute for locking, payments, delivery reassignment, and idempotency
  const { data, error } = await supabase.rpc('reroute_order_rpc', {
    p_order_id: orderId,
    p_backup_restaurant_id: backupRestaurantId,
    p_idempotency_key: idem,
  });

  if (error || !data) {
    console.error('Reroute RPC failed', error);
    return { ok: false, reason: 'reroute_failed' };
  }

  const newOrderId = data as string;

  await createDeliveryEvent({
    order_id: orderId,
    event_type: 'auto_reroute_performed',
    payload: { new_order_id: newOrderId, backup_restaurant_id: backupRestaurantId },
    idempotencyKey: idem,
  });
  await logAudit('auto_reroute_performed', 'orders', orderId, { new_order_id: newOrderId, idempotency_key: idem });

  return { ok: true, newOrderId };
}
