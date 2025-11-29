import { supabase } from '../supabase';
import { MenuItem, MenuItemFilters } from '@/types/database';

export async function getMenuItemsByRestaurant(restaurantId: string, filters?: MenuItemFilters): Promise<MenuItem[]> {
  let query = supabase
    .from('menu_items')
    .select(`
      *,
      restaurant:restaurants(*)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true);

  // Apply filters
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.popular !== undefined) {
    query = query.eq('is_popular', filters.popular);
  }

  if (filters?.priceRange) {
    query = query.gte('price', filters.priceRange[0])
                 .lte('price', filters.priceRange[1]);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Order by popular first, then by sort order
  query = query.order('is_popular', { ascending: false })
              .order('sort_order');

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }

  return data || [];
}

export async function getMenuItemById(id: string): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      restaurant:restaurants(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching menu item:', error);
    return null;
  }

  return data;
}

export async function getMenuItemsByIds(ids: string[]): Promise<MenuItem[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      restaurant:restaurants(*)
    `)
    .in('id', ids);

  if (error) {
    console.error('Error fetching menu items by IDs:', error);
    return [];
  }

  return data || [];
}

export async function createMenuItem(menuItem: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
  const { error } = await supabase
    .from('menu_items')
    .insert(menuItem);

  if (error) {
    console.error('Error creating menu item:', error);
    return false;
  }

  return true;
}

export async function updateMenuItem(menuItemId: string, updates: Partial<MenuItem>): Promise<boolean> {
  const { error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', menuItemId);

  if (error) {
    console.error('Error updating menu item:', error);
    return false;
  }

  return true;
}

export async function deleteMenuItem(menuItemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', menuItemId);

  if (error) {
    console.error('Error deleting menu item:', error);
    return false;
  }

  return true;
}
