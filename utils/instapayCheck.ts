import { supabase } from './supabase';

export async function fetchInstapayStatus(userId: string, role: 'customer' | 'restaurant' | 'delivery') {
  switch (role) {
    case 'customer': {
      const { data } = await supabase
        .from('users')
        .select('instapay_handle, instapay_channel')
        .eq('id', userId)
        .maybeSingle();
      return Boolean(data?.instapay_handle);
    }
    case 'restaurant': {
      const { data } = await supabase
        .from('restaurants')
        .select('payout_account')
        .eq('owner_id', userId)
        .maybeSingle();
      const acct: any = data?.payout_account || {};
      return Boolean(acct.instapayHandle || acct.handle);
    }
    case 'delivery': {
      const { data } = await supabase
        .from('delivery_drivers')
        .select('payout_account')
        .eq('user_id', userId)
        .maybeSingle();
      const acct: any = data?.payout_account || {};
      return Boolean(acct.handle || acct.instapayHandle);
    }
    default:
      return true;
  }
}
