import { supabase } from '../supabase';
import { Order, OrderFilters } from '@/types/database';
import { getPushTokens } from './pushTokens';
import { sendPushNotification } from '../push';

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
  receiptUrl?: string
): Promise<{ data: Order | null; error: any }> {
  // Start a transaction
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      restaurant_id: restaurantId,
      delivery_address_id: deliveryAddressId,
      delivery_address: deliveryAddress,
      subtotal,
      delivery_fee: deliveryFee,
      tax_amount: taxAmount,
      tip_amount: tipAmount,
      total,
      payment_method: paymentMethod,
      delivery_instructions: deliveryInstructions,
      receipt_url: receiptUrl,
      payment_status: receiptUrl ? 'pending' : 'pending_receipt',
      wallet_capture_status: 'pending',
      status: 'pending'
    })
    .select()
    .single();

  if (orderError) {
    return { data: null, error: orderError };
  }

  // Create order items
  const orderItems = items.map(item => ({
    order_id: order.id,
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.unitPrice * item.quantity,
    special_instructions: item.specialInstructions
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return { data: null, error: itemsError };
  }

  // Notify restaurant about new order
  notifyRestaurantNewOrder(restaurantId, order.id, total);

  return { data: order as Order, error: null };
}

async function notifyRestaurantNewOrder(restaurantId: string, orderId: string, total: number) {
  try {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id,name')
      .eq('id', restaurantId)
      .single();

    if (!restaurant?.owner_id) return;
    const { data: tokens } = await getPushTokens([restaurant.owner_id]);
    await Promise.all((tokens || []).map(token => sendPushNotification(
      token,
      'New Order',
      `You have a new order (${orderId.slice(-6).toUpperCase()}) • ${total.toFixed(2)}`,
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

async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
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
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error fetching order:', error);
    return null;
  }

  return data;
}

export async function updateOrderStatus(orderId: string, status: string, additionalData?: any): Promise<boolean> {
  const updateData: any = { status };
  
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
    case 'cancelled':
      updateData.cancelled_at = new Date().toISOString();
      if (additionalData?.cancellation_reason) {
        updateData.cancellation_reason = additionalData.cancellation_reason;
      }
      break;
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
