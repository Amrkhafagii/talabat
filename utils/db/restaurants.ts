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
  const cuisineFilter = filters?.cuisine?.length ? filters.cuisine : filters?.cuisineTags;
  const sanitizedCuisine = cuisineFilter?.map(c => c.replace(/'/g, "''"));
  const minRating = filters?.rating ?? filters?.minRating;
  const maxDeliveryFee = filters?.deliveryFee ?? filters?.maxDeliveryFee;

  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_active', true);

  // Apply filters
  if (sanitizedCuisine && sanitizedCuisine.length > 0) {
    query = query.overlaps('cuisine_tags', sanitizedCuisine.map(c => c.toLowerCase()));
  }

  if (minRating !== undefined) {
    query = query.gte('rating', minRating);
  }

  if (maxDeliveryFee !== undefined) {
    query = query.lte('delivery_fee', maxDeliveryFee);
  }

  if (filters?.deliveryTime !== undefined) {
    query = query.lte('delivery_time', filters.deliveryTime);
  }

  if (filters?.promoted !== undefined) {
    query = query.eq('is_promoted', filters.promoted);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,cuisine.ilike.%${filters.search}%`);
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

  // Compute distance client-side if location is provided
  if (data && hasLocation) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const withDistance = data
      .map((r: any) => {
        if (r.latitude === null || r.longitude === null || r.latitude === undefined || r.longitude === undefined) {
          return { ...r, distance_km: null };
        }
        const dLat = toRad((r.latitude as number) - (options!.lat as number));
        const dLon = toRad((r.longitude as number) - (options!.lng as number));
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(options!.lat as number)) *
            Math.cos(toRad(r.latitude as number)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        return { ...r, distance_km: dist };
      })
      .filter((r: any) => r.distance_km === null || r.distance_km <= maxDistanceKm);

    return withDistance;
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
    .select(`
      *,
      restaurant_hours(*)
    `)
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
  // Only send columns that exist in the table to avoid schema cache errors
  const payload: any = {
    owner_id: restaurant.owner_id,
    name: restaurant.name,
    description: restaurant.description ?? null,
    cuisine: restaurant.cuisine,
    delivery_time: restaurant.delivery_time ?? '30',
    delivery_fee: restaurant.delivery_fee ?? 0,
    minimum_order: restaurant.minimum_order ?? 0,
    image: restaurant.image,
    address: restaurant.address ?? '',
    phone: restaurant.phone ?? null,
    email: restaurant.email ?? null,
    is_promoted: restaurant.is_promoted ?? false,
    is_active: restaurant.is_active ?? true,
    is_open: restaurant.is_open ?? true,
  };

  const { data, error } = await supabase
    .from('restaurants')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error creating restaurant:', error);
    return null;
  }

  return data;
}

export async function updateRestaurant(
  restaurantId: string,
  updates: Partial<Restaurant>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', restaurantId);

  if (error) {
    console.error('Error updating restaurant:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function ensureRestaurantForUser(ownerId: string): Promise<Restaurant | null> {
  const existing = await getRestaurantByUserId(ownerId);
  if (existing) return existing;

  // Create a starter restaurant for new users
  const placeholder = {
    owner_id: ownerId,
    name: 'My Restaurant',
    description: 'Update your restaurant details in Settings.',
    cuisine: 'International',
    delivery_time: '30',
    delivery_fee: 0,
    minimum_order: 0,
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=60',
    address: 'Set your address in Settings',
    phone: null,
    email: null,
    is_promoted: false,
    is_active: true,
    is_open: true,
  } as any;

  const created = await createRestaurant(placeholder);
  return created;
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
  return setRestaurantOnline(restaurantId, isOpen);
}

export async function pauseRestaurantOrders(restaurantId: string): Promise<boolean> {
  return setRestaurantOnline(restaurantId, false);
}

export async function resumeRestaurantOrders(restaurantId: string): Promise<boolean> {
  return setRestaurantOnline(restaurantId, true);
}

export async function setRestaurantOnline(restaurantId: string, isOpen: boolean): Promise<boolean> {
  const rpcName = isOpen ? 'resume_restaurant_orders' : 'pause_restaurant_orders';
  const { data, error } = await supabase.rpc(rpcName, { p_restaurant_id: restaurantId });
  if (error) {
    console.error('Error toggling restaurant online state:', error);
    return false;
  }
  return data !== false;
}
