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
              order_items(
                *,
                menu_item:menu_items(*)
              )
            )
          `)
          .eq('status', 'available')
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

            case 'UPDATE': {
              const isMine = newRecord.driver_id === driverId;
              const wasMine = prevDeliveries.some(d => d.id === newRecord.id);

              // If newly assigned to me, add it
              if (!wasMine && isMine) {
                return [newRecord, ...prevDeliveries];
              }
              // If it was mine and got unassigned/declined, drop it
              if (wasMine && !isMine) {
                return prevDeliveries.filter(delivery => delivery.id !== newRecord.id);
              }
              // If still mine, update fields
              if (wasMine && isMine) {
                return prevDeliveries.map(delivery => 
                  delivery.id === newRecord.id 
                    ? { ...delivery, ...newRecord }
                    : delivery
                );
              }
              return prevDeliveries;
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
              if (newRecord.status === 'available') {
                return [newRecord, ...prevAvailable];
              }
              return prevAvailable;

            case 'UPDATE':
              if (newRecord.status === 'available') {
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

  const acceptDelivery = async (deliveryId: string): Promise<{ ok: boolean; message?: string }> => {
    if (!driverId) {
      return { ok: false, message: 'Driver not loaded' };
    }

    const moveToActive = () => {
      const acceptedDelivery = availableDeliveries.find(d => d.id === deliveryId);
      setAvailableDeliveries(prev => prev.filter(delivery => delivery.id !== deliveryId));
      setDeliveries(prev => {
        const existing = prev.find(d => d.id === deliveryId);
        const mergedDelivery = {
          ...(acceptedDelivery || existing || {}),
          id: deliveryId,
          driver_id: driverId,
          status: 'assigned' as const,
          assigned_at: new Date().toISOString(),
        } as Delivery;

        if (existing) {
          return prev.map(d => (d.id === deliveryId ? mergedDelivery : d));
        }
        return [mergedDelivery, ...prev];
      });
    };

    try {
      // Preferred path: definer-secured RPC (works with RLS)
      const { data, error } = await supabase.rpc('driver_claim_delivery', {
        p_delivery_id: deliveryId
      });

      if (!error && data === true) {
        moveToActive();
        return { ok: true };
      }

      // If the RPC fails, log and attempt legacy fallback (helps when claims/RLS setup lags)
      if (error && typeof error.message === 'string') {
        console.warn('[acceptDelivery] RPC failed, attempting fallback', error.message);
      }

      // Fallback: legacy update for environments where the RPC isn't deployed yet
      const { error: fallbackError } = await supabase
        .from('deliveries')
        .update({
          driver_id: driverId,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('status', 'available');

      if (!fallbackError) {
        moveToActive();
        // Align driver availability with RPC behavior
        const { error: availabilityError } = await supabase
          .from('delivery_drivers')
          .update({ is_available: false })
          .eq('id', driverId);
        if (availabilityError) {
          console.warn('[acceptDelivery] failed to set driver unavailable', availabilityError.message);
        }
        // Don’t surface the RPC error message when fallback succeeded
        return { ok: true };
      }

      const reason = error?.message || fallbackError?.message || 'Unknown error';
      setError('Failed to accept delivery');
      return { ok: false, message: reason };
    } catch (err: any) {
      console.error('Error accepting delivery:', err);
      return { ok: false, message: err?.message || 'Failed to accept delivery' };
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: Delivery['status']) => {
    try {
      const now = new Date().toISOString();
      const updateData: Partial<Delivery> = { 
        status,
        updated_at: now
      };
      
      switch (status) {
        case 'picked_up':
          updateData.picked_up_at = now;
          break;
        case 'on_the_way':
          updateData.picked_up_at = updateData.picked_up_at || now;
          break;
        case 'delivered':
          updateData.delivered_at = now;
          break;
        case 'cancelled':
          updateData.cancelled_at = now;
          break;
      }

      const { error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId);

      if (error) throw error;

       // Also reflect into the parent order for customer tracking
      const deliveryRecord = deliveries.find(d => d.id === deliveryId) || availableDeliveries.find(d => d.id === deliveryId);
      const orderId = deliveryRecord?.order_id;
      if (status === 'delivered' && orderId) {
        const orderUpdate = { status: 'delivered', delivered_at: now, updated_at: now };
        const { error: orderError } = await supabase.from('orders').update(orderUpdate).eq('id', orderId);
        if (orderError) {
          console.warn('[updateDeliveryStatus] failed to mark order delivered', { orderId, message: orderError.message });
        }
      }

      // Optimistically update local state so UI reacts immediately, even before realtime events land
      const applyUpdate = (list: Delivery[]) =>
        list.map(delivery => 
          delivery.id === deliveryId
            ? ({ ...delivery, ...updateData } as Delivery)
            : delivery
        );

      setDeliveries(prev => applyUpdate(prev));
      setAvailableDeliveries(prev => applyUpdate(prev));

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
