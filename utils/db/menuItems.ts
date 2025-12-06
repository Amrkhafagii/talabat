import { supabase } from '../supabase';
import { MenuItem, MenuItemFilters } from '@/types/database';

export async function getMenuItemsByRestaurant(restaurantId: string, filters?: MenuItemFilters): Promise<MenuItem[]> {
  const isUuid = (value: string) => /^[0-9a-fA-F-]{36}$/.test(value);

  let query = supabase
    .from('menu_items')
    .select(`
      *,
      restaurant:restaurants(*),
      category_info:categories(*)
    `)
    .eq('restaurant_id', restaurantId);

  // Apply filters
  if (filters?.category) {
    if (isUuid(filters.category)) {
      query = query.eq('category_id', filters.category);
    } else {
      query = query.eq('category', filters.category);
    }
  }

  if (filters?.popular !== undefined) {
    query = query.eq('is_popular', filters.popular);
  }

  if (filters?.available !== undefined) {
    query = query.eq('is_available', filters.available);
  }

  if (filters?.priceRange) {
    query = query.gte('price', filters.priceRange[0])
                 .lte('price', filters.priceRange[1]);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters?.approvedImagesOnly) {
    query = query.eq('photo_approval_status', 'approved');
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
      restaurant:restaurants(*),
      category_info:categories(*)
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
      restaurant:restaurants(*),
      category_info:categories(*)
    `)
    .in('id', ids)
    .eq('photo_approval_status', 'approved');

  if (error) {
    console.error('Error fetching menu items by IDs:', error);
    return [];
  }

  return data || [];
}

export async function createMenuItem(menuItem: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; errorCode?: string; errorMessage?: string }> {
  const { error } = await supabase
    .from('menu_items')
    .insert({
      ...menuItem,
      variants: menuItem.variants ?? [],
      addons: menuItem.addons ?? [],
      allergens: menuItem.allergens ?? [],
      ingredients: menuItem.ingredients ?? [],
      photo_approval_status: 'pending',
      photo_approval_notes: null,
    });

  if (error) {
    console.error('Error creating menu item:', error);
    return { success: false, errorCode: (error as any).code, errorMessage: error.message };
  }

  return { success: true };
}

export async function updateMenuItem(
  menuItemId: string,
  updates: Partial<MenuItem>,
  restaurantId?: string
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  const imageChanged = Object.prototype.hasOwnProperty.call(updates, 'image');
  const payload: any = {
    ...updates,
    variants: updates.variants ?? undefined,
    addons: updates.addons ?? undefined,
    allergens: updates.allergens ?? undefined,
    ingredients: updates.ingredients ?? undefined,
  };

  if (imageChanged) {
    payload.photo_approval_status = 'pending';
    payload.photo_approval_notes = null;
    payload.photo_reviewed_at = null;
    payload.photo_reviewer = null;
  }

  let query = supabase
    .from('menu_items')
    .update(payload)
    .eq('id', menuItemId);

  if (restaurantId) {
    query = query.eq('restaurant_id', restaurantId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error updating menu item:', error);
    return { success: false, error: error.message, errorCode: (error as any).code };
  }

  return { success: true };
}

export async function deleteMenuItem(menuItemId: string, restaurantId?: string): Promise<{ success: boolean; error?: string }> {
  let query = supabase
    .from('menu_items')
    .delete()
    .eq('id', menuItemId);

  if (restaurantId) {
    query = query.eq('restaurant_id', restaurantId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error deleting menu item:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
