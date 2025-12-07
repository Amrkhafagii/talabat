import { supabase } from '../supabase';
import { RestaurantDashboard, TrustedArrival } from '@/types/database';

export async function getRestaurantDashboard(restaurantId: string, days = 1): Promise<RestaurantDashboard | null> {
  const { data, error } = await supabase.rpc('get_restaurant_dashboard', { p_restaurant_id: restaurantId, p_days: days });
  if (error) {
    console.error('Error fetching restaurant dashboard', error);
    return null;
  }
  return data as RestaurantDashboard;
}

export async function getTrustedArrivals(restaurantId: string, days = 7): Promise<TrustedArrival[]> {
  const { data, error } = await supabase.rpc('get_trusted_arrivals', { p_restaurant_id: restaurantId, p_days: days });
  if (error) {
    console.error('Error fetching trusted arrivals', error);
    return [];
  }
  return (data || []) as TrustedArrival[];
}
