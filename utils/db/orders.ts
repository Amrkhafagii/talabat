import { supabase } from '../supabase';
import { Order, OrderFilters } from '@/types/database';
import { getPushTokens } from './pushTokens';
import { sendPushNotification } from '../push';
import { payoutDriverDelivery } from './wallets';
import { formatCurrency } from '../formatters';
import { computeEtaBand, etaTimestampsFromNow, getRestaurantSla, logAudit, createDeliveryEvent, weatherFactorFromSeverity } from './trustedArrival';
import { logOrderEvent } from './orderEvents';

type SubstitutionDecision = {
  original_item_id: string;
  substitute_item_id?: string;
  decision: 'accept' | 'decline' | 'chat';
  price_delta?: number;
  quantity?: number;
};

export async function createOrder(
  userId: string,
  restaurantId: string,
  deliveryAddressId: string,
  deliveryAddress: string,
  items: { menuItemId: string; quantity: number; unitPrice: number; specialInstructions?: string }[],
  subtotal: number,
  deliveryFee: number,
  taxAmount: number,
  tipAmount: number,
  total: number,
  paymentMethod: string,
  deliveryInstructions?: string,
  receiptUrl?: string,
  options?: {
    etaContext?: { travelMinutes?: number; weatherSeverity?: 'normal' | 'rain' | 'storm'; actorId?: string };
    substitutions?: SubstitutionDecision[];
  }
): Promise<{ data: Order | null; error: any }> {
  const etaContext = options?.etaContext ?? {};
  // Prevent ordering from closed restaurants
  const { data: restaurantStatus, error: restaurantError } = await supabase
    .from('restaurants')
    .select('is_open, delivery_time, rating, latitude, longitude')
    .eq('id', restaurantId)
    .single();

  if (restaurantError) {
    return { data: null, error: restaurantError };
  }

  if (restaurantStatus && restaurantStatus.is_open === false) {
    return { data: null, error: { message: 'Restaurant is closed' } };
  }

  // Compute ETA band (observe-only)
  const sla = await getRestaurantSla(restaurantId);
  const parsedDeliveryMinutes = typeof restaurantStatus?.delivery_time === 'string'
    ? parseInt(restaurantStatus.delivery_time, 10)
    : Number(restaurantStatus?.delivery_time);

  const travelMinutes = etaContext.travelMinutes
    ?? (parsedDeliveryMinutes && !Number.isNaN(parsedDeliveryMinutes) ? Math.max(8, parsedDeliveryMinutes / 2) : 15);

  const etaBand = computeEtaBand({
    prepP50Minutes: sla?.prep_p50_minutes ?? 12,
    prepP90Minutes: sla?.prep_p90_minutes ?? 20,
    bufferMinutes: sla?.buffer_minutes ?? 5,
    travelMinutes,
    weatherSeverity: etaContext?.weatherSeverity ?? 'normal',
    reliabilityScore: sla?.reliability_score ?? (restaurantStatus?.rating ? Math.min(restaurantStatus.rating / 5, 1) : 0.9),
  });

  const etaTimestamps = etaTimestampsFromNow(etaBand);

  // Create order server-side to ensure ledger fields are computed consistently
  const { data: orderId, error: createError } = await supabase.rpc('create_order_payment_pending', {
    p_user_id: userId,
    p_restaurant_id: restaurantId,
    p_delivery_address_id: deliveryAddressId,
    p_delivery_address: deliveryAddress,
    p_subtotal: subtotal,
    p_delivery_fee: deliveryFee,
    p_tax_amount: taxAmount,
    p_tip_amount: tipAmount,
    p_payment_method: paymentMethod,
    p_payment_ref: null,
    p_receipt_url: receiptUrl ?? null,
  });

  if (createError || !orderId) {
    return { data: null, error: createError };
  }

  const { data: order, error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      delivery_instructions: deliveryInstructions,
      eta_promised: etaTimestamps.eta_promised,
      eta_confidence_low: etaTimestamps.eta_confidence_low,
      eta_confidence_high: etaTimestamps.eta_confidence_high,
      wallet_capture_status: 'pending',
      status: 'pending',
    })
    .eq('id', orderId as string)
    .select()
    .single();

  if (orderUpdateError) {
    return { data: null, error: orderUpdateError };
  }

  // Create order items
  const orderItems = items.map(item => {
    const unit = item.unitPrice;
    const qty = item.quantity;
    return {
      order_id: order.id,
      menu_item_id: item.menuItemId,
      quantity: qty,
      unit_price: unit,
      total_price: unit * qty,
      price: unit, // legacy column
      special_instructions: item.specialInstructions ?? null,
    };
  });

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return { data: null, error: itemsError };
  }

  // Notify restaurant about new order
  notifyRestaurantNewOrder(restaurantId, order.id, total);

  // Audit ETA computation (best-effort)
  logAudit('eta_override', 'orders', order.id, {
    eta_minutes: etaBand.etaMinutes,
    eta_low: etaBand.etaLowMinutes,
    eta_high: etaBand.etaHighMinutes,
    trusted: etaBand.trusted,
    weather_factor: etaBand.weatherFactor,
    travel_minutes: travelMinutes,
    source: 'checkout_compute',
  }, etaContext?.actorId);

  // Record substitution choices (best-effort, idempotent)
  if (options?.substitutions && options.substitutions.length > 0) {
    await Promise.all(options.substitutions.map(async decision => {
      // Validate substitution server-side
      const { data: isValid, error: subError } = await supabase.rpc('validate_substitution_choice', {
        p_restaurant_id: restaurantId,
        p_original_item_id: decision.original_item_id,
        p_substitute_item_id: decision.substitute_item_id ?? null,
        p_quantity: decision.quantity ?? 1,
        p_price_delta: decision.price_delta ?? 0
      });
      if (subError || isValid !== true) {
        throw new Error('Invalid substitution choice');
      }

      const payload = {
        decision: decision.decision,
        original_item_id: decision.original_item_id,
        substitute_item_id: decision.substitute_item_id,
        price_delta: decision.price_delta,
        quantity: decision.quantity,
      };
      const idem = `${order.id}_${decision.original_item_id}`;
      await createDeliveryEvent({
        order_id: order.id,
        event_type: 'substitution_choice',
        payload,
        idempotencyKey: idem,
      });
      await logAudit('substitution_choice', 'order_items', order.id, { ...payload, idempotency_key: idem }, userId);
    }));
  }

  // Centralize ETA write on server for consistency
  await supabase.rpc('set_order_eta_from_components', {
    p_order_id: order.id,
    p_prep_p50: sla?.prep_p50_minutes ?? 12,
    p_prep_p90: sla?.prep_p90_minutes ?? 20,
    p_buffer: sla?.buffer_minutes ?? 5,
    p_travel_minutes: travelMinutes,
    p_weather_factor: weatherFactorFromSeverity(etaContext?.weatherSeverity ?? 'normal'),
    p_reliability: sla?.reliability_score ?? (restaurantStatus?.rating ? Math.min(restaurantStatus.rating / 5, 1) : 0.9),
  });

  return { data: order as Order, error: null };
}

async function notifyRestaurantNewOrder(restaurantId: string, orderId: string, total: number) {
  try {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id,name,is_open')
      .eq('id', restaurantId)
      .single();

    if (!restaurant?.owner_id) return;
    if (restaurant.is_open === false) {
      // Do not notify if restaurant is closed (order creation is already blocked)
      return;
    }
    const { data: tokens } = await getPushTokens([restaurant.owner_id]);
    await Promise.all((tokens || []).map(token => sendPushNotification(
      token,
      'New Order',
      `You have a new order (${orderId.slice(-6).toUpperCase()}) • ${formatCurrency(total)}`,
      { orderId }
    )));
  } catch (err) {
    console.error('Error notifying restaurant about new order:', err);
  }
}

async function getUserOrders(userId: string, filters?: OrderFilters): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      restaurant:restaurants(*),
      order_items(
        *,
        menu_item:menu_items(*)
      ),
      delivery:deliveries(
        *,
        driver:delivery_drivers(*)
      )
    `)
    .eq('user_id', userId);

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.restaurant) {
    query = query.eq('restaurant_id', filters.restaurant);
  }

  if (filters?.dateRange) {
    query = query.gte('created_at', filters.dateRange[0])
                 .lte('created_at', filters.dateRange[1]);
  }

  if (filters?.minTotal) {
    query = query.gte('total', filters.minTotal);
  }

  if (filters?.maxTotal) {
    query = query.lte('total', filters.maxTotal);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }

  return data || [];
}

async function getRestaurantOrders(restaurantId: string, filters?: OrderFilters): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        menu_item:menu_items(*)
      ),
      delivery:deliveries(
        *,
        driver:delivery_drivers(*)
      )
    `)
    .eq('restaurant_id', restaurantId);

  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.dateRange) {
    query = query.gte('created_at', filters.dateRange[0])
                 .lte('created_at', filters.dateRange[1]);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching restaurant orders:', error);
    return [];
  }

  return data || [];
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      restaurant:restaurants(*),
      user:users(*),
      order_items(
        *,
        menu_item:menu_items(*)
      ),
      delivery:deliveries(
        *,
        driver:delivery_drivers(*)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error fetching order:', error);
    return null;
  }

  return data;
}

type UpdateOrderStatusOptions = {
  cancellationReason?: string;
  skipPaymentCheck?: boolean;
  [key: string]: any;
};

export async function updateOrderStatus(orderId: string, status: string, additionalData?: UpdateOrderStatusOptions): Promise<boolean> {
  const updateData: any = { status };
  const requiresPaymentApproval = ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(status);
  const skipPaymentCheck = additionalData?.skipPaymentCheck === true;

  if (requiresPaymentApproval && !skipPaymentCheck) {
    const { data: orderPayment, error: paymentError } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('id', orderId)
      .single();

    if (paymentError || !orderPayment || orderPayment.payment_status !== 'paid') {
      console.warn('Cannot update order status until receipt is approved', { orderId, status });
      return false;
    }
  }
  
  // Add timestamp fields based on status
  switch (status) {
    case 'confirmed':
      updateData.confirmed_at = new Date().toISOString();
      break;
    case 'preparing':
      updateData.confirmed_at = updateData.confirmed_at || new Date().toISOString();
      break;
    case 'ready':
      updateData.prepared_at = new Date().toISOString();
      break;
    case 'picked_up':
      updateData.picked_up_at = new Date().toISOString();
      break;
    case 'delivered':
      updateData.delivered_at = new Date().toISOString();
      break;
    case 'cancelled': {
      updateData.cancelled_at = new Date().toISOString();
      const reason = additionalData?.cancellationReason ?? (additionalData as any)?.cancellation_reason;
      updateData.cancellation_reason = reason || 'unspecified';
      break;
    }
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
    return false;
  }

  return true;
}
