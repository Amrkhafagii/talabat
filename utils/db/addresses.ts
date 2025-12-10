import { supabase } from '../supabase';
import { UserAddress } from '@/types/database';

type UserAddressInput = Omit<UserAddress, 'id' | 'created_at' | 'updated_at'>;

const normalizeTag = (tag?: string | null) => {
  const val = (tag || '').toLowerCase();
  return ['home', 'work', 'other', 'custom'].includes(val) ? (val as UserAddress['tag']) : 'custom';
};

const applyAddressDefaults = (address: Partial<UserAddress>): Partial<UserAddress> => ({
  ...address,
  tag: normalizeTag((address as any)?.tag ?? address.label),
});

export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching user addresses:', error);
    return [];
  }

  return data || [];
}

export async function createUserAddress(
  address: UserAddressInput
): Promise<{ address: UserAddress | null; errorCode?: string; errorMessage?: string }> {
  const payload = applyAddressDefaults(address);
  const shouldSetDefault = payload.is_default === true;

  // Avoid partial unique index conflict; set default in a follow-up RPC
  const insertPayload = {
    ...payload,
    is_default: shouldSetDefault ? false : payload.is_default ?? false,
  } as any;

  const { data, error } = await supabase
    .from('user_addresses')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Error creating user address:', error);
    return { address: null, errorCode: (error as any).code, errorMessage: error.message };
  }

  if ((data?.id && shouldSetDefault) || (data?.id && data?.is_default)) {
    const defaultOk = await setDefaultAddress(data.id);
    if (defaultOk) {
      data.is_default = true;
    }
  }

  return { address: data, errorCode: undefined, errorMessage: undefined };
}

export async function updateUserAddress(addressId: string, updates: Partial<UserAddress>): Promise<boolean> {
  const normalized = applyAddressDefaults(updates);
  const { is_default, ...rest } = normalized;

  const hasUpdateFields = Object.keys(rest).length > 0;

  if (hasUpdateFields) {
    const { error } = await supabase
      .from('user_addresses')
      .update(rest)
      .eq('id', addressId);

    if (error) {
      console.error('Error updating user address:', error);
      return false;
    }
  }

  if (is_default) {
    const ok = await setDefaultAddress(addressId);
    if (!ok) return false;
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

export async function setDefaultAddress(addressId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_default_address', { p_address_id: addressId });
  if (error) {
    console.error('Error setting default address:', error);
    return false;
  }
  return data !== false;
}
