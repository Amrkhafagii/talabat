import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Order } from '@/types/database';

interface UseRealtimeOrdersProps {
  userId?: string;
  restaurantId?: string;
  driverId?: string;
  orderIds?: string[];
}

export function useRealtimeOrders({
  userId,
  restaurantId,
  driverId,
  orderIds
}: UseRealtimeOrdersProps) {
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
        query = query.eq('restaurant_id', restaurantId);
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
  }, [orderIds, restaurantId, userId]);

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
      if (orderIds && orderIds.length > 0) return `id=in.(${orderIds.join(',')})`;
      return undefined;
    };

    const handleOrderChange = (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      setOrders(prevOrders => {
        switch (eventType) {
          case 'INSERT':
            // Check if this order should be included based on filters
            if (shouldIncludeOrder(newRecord)) {
              return [newRecord, ...prevOrders];
            }
            return prevOrders;

          case 'UPDATE':
            return prevOrders.map(order => 
              order.id === newRecord.id 
                ? { ...order, ...newRecord }
                : order
            );

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
      if (restaurantId && order.restaurant_id === restaurantId) return true;
      if (orderIds && orderIds.includes(order.id)) return true;
      return false;
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadInitialOrders, orderIds?.join(','), restaurantId, userId]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
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
