import { supabase } from '../supabase';
import { Restaurant, RestaurantFilters } from '@/types/database';

interface RestaurantQueryOptions {
  page?: number;
  pageSize?: number;
  lat?: number;
  lng?: number;
  maxDistanceKm?: number;
}

export async function getRestaurants(filters?: RestaurantFilters, options?: RestaurantQueryOptions): Promise<Restaurant[]> {
  const pageSize = options?.pageSize ?? 20;
  const page = options?.page ?? 0;
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const hasLocation = options?.lat !== undefined && options?.lng !== undefined;
  const maxDistanceKm = options?.maxDistanceKm ?? 15;

  let query = supabase
    .from('restaurants')
    .select(`
      *,
      distance_km: (
        case 
          when ${hasLocation} then
            6371 * acos(
              cos(radians(${options?.lat ?? 0})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians(${options?.lng ?? 0})) +
              sin(radians(${options?.lat ?? 0})) * sin(radians(latitude))
            )
          else null end
      )
    `)
    .eq('is_active', true);

  // Apply filters
  if (filters?.cuisine && filters.cuisine.length > 0) {
    query = query.in('cuisine', filters.cuisine);
  }

  if (filters?.rating) {
    query = query.gte('rating', filters.rating);
  }

  if (filters?.deliveryFee) {
    query = query.lte('delivery_fee', filters.deliveryFee);
  }

  if (filters?.promoted !== undefined) {
    query = query.eq('is_promoted', filters.promoted);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,cuisine.ilike.%${filters.search}%`);
  }

  // Distance filter and pagination
  if (hasLocation) {
    query = query.filter('distance_km', 'lte', maxDistanceKm);
  }

  query = query.range(from, to);

  // Order by promoted first, then by rating
  query = query.order('is_promoted', { ascending: false })
              .order('rating', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }

  return data || [];
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      restaurant_hours(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching restaurant:', error);
    return null;
  }

  return data;
}

export async function getRestaurantByUserId(userId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user restaurant:', error);
    return null;
  }

  return data ?? null;
}

export async function createRestaurant(
  restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews'> & { owner_id: string }
): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .insert(restaurant)
    .select()
    .single();

  if (error) {
    console.error('Error creating restaurant:', error);
    return null;
  }

  return data;
}

export async function updateRestaurant(restaurantId: string, updates: Partial<Restaurant>): Promise<boolean> {
  const { error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', restaurantId);

  if (error) {
    console.error('Error updating restaurant:', error);
    return false;
  }

  return true;
}

export interface RestaurantHourInput {
  day_of_week: number;
  open_time?: string | null;
  close_time?: string | null;
  is_closed?: boolean;
}

export async function upsertRestaurantHours(restaurantId: string, hours: RestaurantHourInput[]): Promise<boolean> {
  if (!hours || hours.length === 0) return true;

  const rows = hours.map(h => ({
    restaurant_id: restaurantId,
    day_of_week: h.day_of_week,
    open_time: h.open_time ?? null,
    close_time: h.close_time ?? null,
    is_closed: h.is_closed ?? false,
  }));

  const { error } = await supabase
    .from('restaurant_hours')
    .upsert(rows, { onConflict: 'restaurant_id,day_of_week' });

  if (error) {
    console.error('Error upserting restaurant hours:', error);
    return false;
  }

  return true;
}

export async function toggleRestaurantOpen(restaurantId: string, isOpen: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('restaurants')
    .update({ is_open: isOpen })
    .eq('id', restaurantId);

  if (error) {
    console.error('Error toggling restaurant open state:', error);
    return false;
  }

  return true;
}
