import { supabase } from '../supabase';
import { ItemSubstitution, MenuItem } from '@/types/database';

export interface SubstitutionSuggestion {
  rule: ItemSubstitution;
  substitute: MenuItem;
}

export async function getSubstitutionForItem(itemId: string): Promise<SubstitutionSuggestion | null> {
  const { data, error } = await supabase
    .from('item_substitutions')
    .select(`
      *,
      substitute:substitute_item_id (*)
    `)
    .eq('item_id', itemId)
    .eq('auto_apply', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  if (!data?.substitute) return null;

  return { rule: data as any, substitute: (data as any).substitute as MenuItem };
}

export async function getAutoApplySubstitution(itemId: string): Promise<SubstitutionSuggestion | null> {
  const { data, error } = await supabase
    .from('item_substitutions')
    .select(`
      *,
      substitute:substitute_item_id (*)
    `)
    .eq('item_id', itemId)
    .eq('auto_apply', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  if (!data?.substitute) return null;

  return { rule: data as any, substitute: (data as any).substitute as MenuItem };
}

export async function listSubstitutionsByRestaurant(restaurantId: string): Promise<ItemSubstitution[]> {
  const { data, error } = await supabase
    .from('item_substitutions')
    .select(`
      *,
      item:item_id(id,name,price),
      substitute_item:substitute_item_id(id,name,price)
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing substitutions:', error);
    return [];
  }
  return data || [];
}

export async function upsertSubstitution(input: {
  restaurant_id: string;
  item_id: string;
  substitute_item_id: string;
  rule_type?: string;
  max_delta_pct?: number;
  auto_apply?: boolean;
  notes?: string;
}) {
  const { error } = await supabase
    .from('item_substitutions')
    .upsert(
      {
        restaurant_id: input.restaurant_id,
        item_id: input.item_id,
        substitute_item_id: input.substitute_item_id,
        rule_type: input.rule_type ?? 'same-category',
        max_delta_pct: input.max_delta_pct ?? 10,
        auto_apply: input.auto_apply ?? false,
        notes: input.notes ?? null,
      },
      { onConflict: 'restaurant_id,item_id,substitute_item_id' }
    );

  if (error) {
    console.error('Error upserting substitution:', error);
    return false;
  }
  return true;
}
