import { supabase } from '../supabase';
import { UserAddress } from '@/types/database';

export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });

  if (error) {
    console.error('Error fetching user addresses:', error);
    return [];
  }

  return data || [];
}

export async function createUserAddress(
  address: Omit<UserAddress, 'id' | 'created_at' | 'updated_at'>
): Promise<{ address: UserAddress | null; errorCode?: string; errorMessage?: string }> {
  const { data, error } = await supabase
    .from('user_addresses')
    .insert(address)
    .select()
    .single();

  if (error) {
    console.error('Error creating user address:', error);
    return { address: null, errorCode: (error as any).code, errorMessage: error.message };
  }

  return { address: data, errorCode: undefined, errorMessage: undefined };
}

export async function updateUserAddress(addressId: string, updates: Partial<UserAddress>): Promise<boolean> {
  const { error } = await supabase
    .from('user_addresses')
    .update(updates)
    .eq('id', addressId);

  if (error) {
    console.error('Error updating user address:', error);
    return false;
  }

  return true;
}

export async function deleteUserAddress(addressId: string): Promise<{ ok: boolean; reason?: string }> {
  // Check for dependent orders first to avoid FK violations
  try {
    const { data: dependentOrders, error: depError } = await supabase
      .from('orders')
      .select('id')
      .eq('delivery_address_id', addressId)
      .limit(1);

    if (!depError && dependentOrders && dependentOrders.length > 0) {
      return { ok: false, reason: 'address_has_orders' };
    }
  } catch (checkErr) {
    console.warn('deleteUserAddress: pre-check failed', (checkErr as any)?.message);
  }

  const { error } = await supabase
    .from('user_addresses')
    .delete()
    .eq('id', addressId);

  if (error) {
    const code = (error as any)?.code;
    if (code === '23503') {
      // FK violation: address referenced by orders
      return { ok: false, reason: 'address_has_orders' };
    }

    console.error('Error deleting user address:', error);
    return { ok: false, reason: (error as any)?.message };
  }

  return { ok: true };
}
