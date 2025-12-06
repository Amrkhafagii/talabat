import { supabase } from '../supabase';
import { Category } from '@/types/database';

export async function getCategories(restaurantId?: string | null): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (restaurantId) {
    query = query.or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`);
  } else {
    query = query.is('restaurant_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

async function getCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching category:', error);
    return null;
  }

  return data;
}

export async function createCategory(payload: Omit<Category, 'id' | 'created_at'>): Promise<{ category: Category | null; errorCode?: string; errorMessage?: string }> {
  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return { category: null, errorCode: (error as any).code, errorMessage: error.message };
  }

  return { category: data, errorCode: undefined, errorMessage: undefined };
}

export async function updateCategory(categoryId: string, updates: Partial<Category>): Promise<boolean> {
  const { error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId);

  if (error) {
    console.error('Error updating category:', error);
    return false;
  }

  return true;
}

export async function reorderCategories(order: { id: string; sort_order: number }[]): Promise<boolean> {
  const payload = order.map((c) => ({ id: c.id, sort_order: c.sort_order }));
  const { error } = await supabase.from('categories').upsert(payload);
  if (error) {
    console.error('Error reordering categories:', error);
    return false;
  }
  return true;
}

export async function deleteCategory(categoryId: string): Promise<boolean> {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }
  return true;
}
