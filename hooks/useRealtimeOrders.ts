import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Order } from '@/types/database';

interface UseRealtimeOrdersProps {
  userId?: string;
  restaurantId?: string;
  driverId?: string;
  orderIds?: string[];
}

const RESTAURANT_ORDER_PAYMENT_STATUSES = ['paid', 'paid_pending_review', 'payment_pending', 'hold', 'initiated', 'captured'];
const PAYMENT_APPROVED_STATUSES = ['paid', 'captured'];

export function useRealtimeOrders({
  userId,
  restaurantId,
  driverId,
  orderIds
}: UseRealtimeOrdersProps) {
  const orderIdsKey = orderIds && orderIds.length > 0 ? orderIds.join(',') : '';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialOrders = useCallback(async () => {
    try {
      setLoading(true);
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
        `);

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId).in('payment_status', RESTAURANT_ORDER_PAYMENT_STATUSES);
      } else if (orderIds && orderIds.length > 0) {
        query = query.in('id', orderIds);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setOrders(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading initial orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [orderIdsKey, restaurantId, userId]);

  useEffect(() => {
    let channel: any;

    const setupRealtimeSubscription = async () => {
      try {
        // Initial data load
        await loadInitialOrders();

        // Set up realtime subscription
        channel = supabase
          .channel('orders-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: getFilter()
            },
            (payload: any) => {
              handleOrderChange(payload);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'deliveries',
            },
            (payload: any) => {
              handleDeliveryChange(payload);
            }
          )
          .subscribe();

      } catch (err) {
        console.error('Error setting up realtime subscription:', err);
        setError('Failed to set up real-time updates');
      }
    };

    const getFilter = () => {
      if (userId) return `user_id=eq.${userId}`;
      if (restaurantId) return `restaurant_id=eq.${restaurantId}`;
      if (orderIdsKey) return `id=in.(${orderIdsKey})`;
      return undefined;
    };

    const handleOrderChange = (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      setOrders(prevOrders => {
        switch (eventType) {
          case 'INSERT':
            if (shouldIncludeOrder(newRecord)) {
              return [newRecord, ...prevOrders];
            }
            return prevOrders;

          case 'UPDATE': {
            const exists = prevOrders.some(o => o.id === newRecord.id);
            if (!exists && shouldIncludeOrder(newRecord)) {
              return [newRecord, ...prevOrders];
            }
            if (exists && !shouldIncludeOrder(newRecord)) {
              return prevOrders.filter(order => order.id !== newRecord.id);
            }
            return prevOrders.map(order => 
              order.id === newRecord.id 
                ? { ...order, ...newRecord }
                : order
            );
          }

          case 'DELETE':
            return prevOrders.filter(order => order.id !== oldRecord.id);

          default:
            return prevOrders;
        }
      });
    };

    const handleDeliveryChange = (payload: any) => {
      const { eventType, new: newRecord } = payload;

      if (eventType === 'UPDATE' && newRecord.order_id) {
        // Update the delivery information in the corresponding order
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === newRecord.order_id
              ? { ...order, delivery: newRecord }
              : order
          )
        );
      }
    };

    const shouldIncludeOrder = (order: any) => {
      if (userId && order.user_id === userId) return true;
      if (restaurantId && order.restaurant_id === restaurantId) {
        return !order.payment_status || RESTAURANT_ORDER_PAYMENT_STATUSES.includes(order.payment_status);
      }
      if (orderIds && orderIds.includes(order.id)) return true;
      return false;
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadInitialOrders, orderIdsKey, restaurantId, userId]);

  const updateOrderStatus = async (
    orderId: string,
    status: string,
    options?: { cancellationReason?: string }
  ) => {
    try {
      // Only drivers/delivery flow should complete the order. If this hook is used from the
      // restaurant surface, block "delivered" unless the delivery row is already delivered.
      if (status === 'delivered') {
        const { data: deliveryRow, error: deliveryLookupError } = await supabase
          .from('deliveries')
          .select('status')
          .eq('order_id', orderId)
          .maybeSingle();

        if (deliveryLookupError) {
          console.warn('Cannot verify delivery before marking delivered', deliveryLookupError.message);
          return false;
        }

        if (deliveryRow && deliveryRow.status !== 'delivered') {
          console.warn('Restaurant UI attempted to mark delivered before driver completed handoff', {
            orderId,
            deliveryStatus: deliveryRow.status,
          });
          return false;
        }
      }

      const requiresPaymentApproval = ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(status);

      if (requiresPaymentApproval) {
        const { data: orderPayment, error: paymentError } = await supabase
          .from('orders')
          .select('payment_status')
          .eq('id', orderId)
          .single();

        if (paymentError || !orderPayment || !PAYMENT_APPROVED_STATUSES.includes(orderPayment.payment_status)) {
          console.warn('Cannot update order status until receipt is approved', { orderId, status });
          return false;
        }
      }

      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };
      if (status === 'cancelled') {
        updates.cancellation_reason = options?.cancellationReason || 'Restaurant cancelled';
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      // If restaurant rejects/cancels, queue refund for admin review
      if (status === 'cancelled') {
        await supabase.rpc('enqueue_order_refund', {
          p_order_id: orderId,
          p_reason: updates.cancellation_reason || 'Restaurant cancelled',
        });
      }

      return true;
    } catch (err) {
      console.error('Error updating order status:', err);
      return false;
    }
  };

  return {
    orders,
    loading,
    error,
    updateOrderStatus,
    refetch: loadInitialOrders
  };
}
