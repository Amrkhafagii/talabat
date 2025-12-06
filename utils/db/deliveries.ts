import { supabase } from '../supabase';
import { Delivery } from '@/types/database';
import { updateOrderStatus } from './orders';
import { payoutDriverDelivery } from './wallets';
import { createDeliveryEvent, logAudit } from './trustedArrival';

type AssignDriverResult =
  | { ok: true; driverId: string; deliveryId?: string; alreadyAssigned?: boolean }
  | { ok: false; reason: string; deliveryId?: string };

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getAvailableDeliveries(): Promise<Delivery[]> {
  const { data, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      order:orders(
        *,
        restaurant:restaurants(*),
        order_items(
          *,
          menu_item:menu_items(*)
        )
      )
    `)
    .eq('status', 'available')
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
  let startDate: Date | undefined;

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
    .eq('status', 'available'); // Only accept if still available

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
    // Free the driver for new jobs if they remain online
    const { data: deliveryRow, error: deliveryLookupError } = await supabase
      .from('deliveries')
      .select('driver_id')
      .eq('id', deliveryId)
      .maybeSingle();
    if (!deliveryLookupError && deliveryRow?.driver_id) {
      const { data: driverRow } = await supabase
        .from('delivery_drivers')
        .select('is_online')
        .eq('id', deliveryRow.driver_id)
        .maybeSingle();
      const backToAvailable = driverRow?.is_online === true;
      const { error: availError } = await supabase
        .from('delivery_drivers')
        .update({ is_available: backToAvailable })
        .eq('id', deliveryRow.driver_id);
      if (availError) {
        console.warn('updateDeliveryStatus: failed to toggle driver availability', availError);
      }
    }
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

export async function assignNearestDriverForOrder(orderId: string, maxDistanceKm = 5): Promise<AssignDriverResult> {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        delivery_address,
        delivery_address_id,
        delivery_fee,
        restaurant:restaurants(id, address, latitude, longitude),
        delivery:deliveries(id, status, driver_id)
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('assignNearestDriverForOrder: failed to load order', orderError);
      return { ok: false, reason: 'order_not_found' };
    }

    if (order.delivery?.driver_id) {
      return { ok: true, driverId: order.delivery.driver_id, deliveryId: order.delivery.id, alreadyAssigned: true };
    }

    let deliveryId = order.delivery?.id;

    const pickupLat = order.restaurant?.latitude;
    const pickupLng = order.restaurant?.longitude;
    if (pickupLat === null || pickupLat === undefined || pickupLng === null || pickupLng === undefined) {
      console.warn('assignNearestDriverForOrder: missing restaurant coordinates', { orderId });
      return { ok: false, reason: 'missing_restaurant_location' };
    }

    let dropLat: number | null = null;
    let dropLng: number | null = null;

    if (order.delivery_address_id) {
      const { data: address, error: addressError } = await supabase
        .from('user_addresses')
        .select('latitude, longitude')
        .eq('id', order.delivery_address_id)
        .maybeSingle();

      if (!addressError && address) {
        dropLat = address.latitude ?? null;
        dropLng = address.longitude ?? null;
      } else {
        // If RLS blocks the address (restaurant/driver context), fallback to a definer RPC
        const { data: coords, error: coordError } = await supabase.rpc('get_user_address_coords', {
          p_address_id: order.delivery_address_id
        });
        if (!coordError && coords) {
          dropLat = (coords as any).latitude ?? null;
          dropLng = (coords as any).longitude ?? null;
        } else if (coordError) {
          console.warn('assignNearestDriverForOrder: failed to load address coords via RPC', { coordError });
        }
      }
    }

    const { data: drivers, error: driversError } = await supabase
      .from('delivery_drivers')
      .select('id, current_latitude, current_longitude')
      .eq('is_online', true)
      .eq('is_available', true)
      .eq('documents_verified', true)
      .eq('license_document_status', 'approved');

    if (driversError) {
      console.error('assignNearestDriverForOrder: failed to fetch drivers', driversError);
      return { ok: false, reason: 'driver_lookup_failed' };
    }

    const totalDrivers = drivers?.length ?? 0;

    type NearbyDriver = { id: string; distanceKm: number; current_latitude: number; current_longitude: number };

    const nearbyDrivers: NearbyDriver[] = (drivers || [])
      .map((driver: { id: string; current_latitude: number | null; current_longitude: number | null }) => {
        if (driver.current_latitude === null || driver.current_longitude === null ||
            driver.current_latitude === undefined || driver.current_longitude === undefined) {
          return null;
        }
        const distanceKm = haversineDistanceKm(
          Number(pickupLat),
          Number(pickupLng),
          Number(driver.current_latitude),
          Number(driver.current_longitude)
        );
        return { ...driver, distanceKm };
      })
      .filter((driver: NearbyDriver | null): driver is NearbyDriver => !!driver && driver.distanceKm <= maxDistanceKm)
      .sort((a: NearbyDriver, b: NearbyDriver) => a.distanceKm - b.distanceKm);

    const missingCoords = (drivers || []).filter(
      (d: any) => d.current_latitude === null || d.current_latitude === undefined || d.current_longitude === null || d.current_longitude === undefined
    ).length;

    if (!nearbyDrivers.length) {
      console.warn('assignNearestDriverForOrder: no nearby drivers', {
        totalDrivers,
        missingCoords,
        maxDistanceKm,
        pickupLat,
        pickupLng,
      });
    }

    const chosenDriver = nearbyDrivers[0];
    const dropDistanceKm = dropLat !== null && dropLng !== null
      ? haversineDistanceKm(Number(pickupLat), Number(pickupLng), Number(dropLat), Number(dropLng))
      : null;
    const distanceKmSafe = dropDistanceKm ?? 0;
    const estimatedMinutes = dropDistanceKm ? Math.max(8, Math.round(dropDistanceKm * 4)) : Math.max(8, Math.round(distanceKmSafe * 4) || 10);

    const basePayload: any = {
      driver_id: chosenDriver?.id ?? null,
      pickup_address: order.restaurant?.address || order.delivery_address,
      delivery_address: order.delivery_address,
      pickup_latitude: pickupLat,
      pickup_longitude: pickupLng,
      delivery_latitude: dropLat,
      delivery_longitude: dropLng,
      distance_km: distanceKmSafe,
      distance: distanceKmSafe,
      estimated_duration_minutes: estimatedMinutes,
      estimated_time: `${estimatedMinutes} min`,
      delivery_fee: order.delivery_fee ?? 0,
      driver_earnings: order.delivery_fee ?? 0,
      status: chosenDriver ? 'assigned' : 'available',
      assigned_at: chosenDriver ? new Date().toISOString() : null
    };

    if (deliveryId) {
      const { error: updateError } = await supabase
        .from('deliveries')
        .update(basePayload)
        .eq('id', deliveryId);

      if (updateError) {
        console.error('assignNearestDriverForOrder: failed to update delivery', updateError);
        return { ok: false, reason: 'delivery_upsert_failed', deliveryId };
      }
    } else {
      const { data: newDelivery, error: insertError } = await supabase
        .from('deliveries')
        .insert([{ order_id: orderId, ...basePayload }])
        .select('id')
        .maybeSingle();

      if (insertError || !newDelivery) {
        console.error('assignNearestDriverForOrder: failed to create delivery', insertError);
        return { ok: false, reason: 'delivery_upsert_failed' };
      }

      deliveryId = newDelivery.id;
    }

    if (chosenDriver) {
      await supabase
        .from('delivery_drivers')
        .update({ is_available: false })
        .eq('id', chosenDriver.id);

      return { ok: true, driverId: chosenDriver.id, deliveryId };
    }

    return { ok: false, reason: 'no_driver_available', deliveryId };
  } catch (err) {
    console.error('assignNearestDriverForOrder: unexpected error', err);
    return { ok: false, reason: 'unknown_error' };
  }
}
