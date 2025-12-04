import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Delivery } from '@/types/database';

interface UseRealtimeDeliveriesProps {
  driverId?: string;
  includeAvailable?: boolean;
}

export function useRealtimeDeliveries({
  driverId,
  includeAvailable = false
}: UseRealtimeDeliveriesProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialDeliveries = useCallback(async () => {
    try {
      setLoading(true);

      const queries = [];

      // Load driver's assigned deliveries
      if (driverId) {
        const driverQuery = supabase
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
          .in('status', ['assigned', 'picked_up', 'on_the_way']);

        queries.push(driverQuery);
      }

      // Load available deliveries
      if (includeAvailable) {
        const availableQuery = supabase
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

        queries.push(availableQuery);
      }

      const results = await Promise.all(queries);

      if (driverId && results[0]) {
        const { data: driverDeliveries, error: driverError } = results[0];
        if (driverError) throw driverError;
        setDeliveries(driverDeliveries || []);
      }

      if (includeAvailable) {
        const availableIndex = driverId ? 1 : 0;
        if (results[availableIndex]) {
          const { data: available, error: availableError } = results[availableIndex];
          if (availableError) throw availableError;
          setAvailableDeliveries(available || []);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error loading initial deliveries:', err);
      setError('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, [driverId, includeAvailable]);

  useEffect(() => {
    let channel: any;

    const setupRealtimeSubscription = async () => {
      try {
        // Initial data load
        await loadInitialDeliveries();

        // Set up realtime subscription
        channel = supabase
          .channel('deliveries-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'deliveries'
            },
            (payload: any) => {
              handleDeliveryChange(payload);
            }
          )
          .subscribe();

      } catch (err) {
        console.error('Error setting up deliveries realtime subscription:', err);
        setError('Failed to set up real-time updates');
      }
    };

    const handleDeliveryChange = (payload: any) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Update driver's assigned deliveries
      if (driverId) {
        setDeliveries(prevDeliveries => {
          switch (eventType) {
            case 'INSERT':
              if (newRecord.driver_id === driverId) {
                return [newRecord, ...prevDeliveries];
              }
              return prevDeliveries;

            case 'UPDATE':
              if (newRecord.driver_id === driverId) {
                return prevDeliveries.map(delivery => 
                  delivery.id === newRecord.id 
                    ? { ...delivery, ...newRecord }
                    : delivery
                );
              } else {
                // Delivery was reassigned to another driver
                return prevDeliveries.filter(delivery => delivery.id !== newRecord.id);
              }

            case 'DELETE':
              return prevDeliveries.filter(delivery => delivery.id !== oldRecord.id);

            default:
              return prevDeliveries;
          }
        });
      }

      // Update available deliveries
      if (includeAvailable) {
        setAvailableDeliveries(prevAvailable => {
          switch (eventType) {
            case 'INSERT':
              if (newRecord.status === 'pending') {
                return [newRecord, ...prevAvailable];
              }
              return prevAvailable;

            case 'UPDATE':
              if (newRecord.status === 'pending') {
                const exists = prevAvailable.some(d => d.id === newRecord.id);
                if (exists) {
                  return prevAvailable.map(delivery => 
                    delivery.id === newRecord.id 
                      ? { ...delivery, ...newRecord }
                      : delivery
                  );
                } else {
                  return [newRecord, ...prevAvailable];
                }
              } else {
                // Delivery is no longer available
                return prevAvailable.filter(delivery => delivery.id !== newRecord.id);
              }

            case 'DELETE':
              return prevAvailable.filter(delivery => delivery.id !== oldRecord.id);

            default:
              return prevAvailable;
          }
        });
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [driverId, includeAvailable, loadInitialDeliveries]);

  const acceptDelivery = async (deliveryId: string) => {
    if (!driverId) return false;

    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          driver_id: driverId,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('status', 'pending');

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error accepting delivery:', err);
      return false;
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      switch (status) {
        case 'picked_up':
          updateData.picked_up_at = new Date().toISOString();
          break;
        case 'on_the_way':
          updateData.picked_up_at = updateData.picked_up_at || new Date().toISOString();
          break;
        case 'delivered':
          updateData.delivered_at = new Date().toISOString();
          break;
        case 'cancelled':
          updateData.cancelled_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating delivery status:', err);
      return false;
    }
  };

  return {
    deliveries,
    availableDeliveries,
    loading,
    error,
    acceptDelivery,
    updateDeliveryStatus,
    refetch: loadInitialDeliveries
  };
}
