// @ts-nocheck
import { supabase } from '../supabase';
import { getServiceSupabase } from '../supabaseService';

export async function upsertPushToken(userId: string, token: string, platform?: string): Promise<{ success: boolean; error: any }> {
  const { error } = await supabase
    .from('user_push_tokens')
    .upsert(
      { user_id: userId, token, platform },
      { onConflict: 'token' }
    );

  if (error) {
    return { success: false, error };
  }
  return { success: true, error: null };
}

export async function getPushTokens(userIds: string[]): Promise<{ data: string[]; error: any }> {
  if (userIds.length === 0) return { data: [], error: null };

  const serviceSupabase = getServiceSupabase();
  if (serviceSupabase) {
    const { data, error } = await serviceSupabase.rpc('get_push_tokens_for_users', {
      p_user_ids: userIds,
    });

    if (error) {
      return { data: [], error };
    }

    return { data: (data || []).map((d: any) => d.token), error: null };
  }

  // Fallback to auth-scoped lookup (only returns tokens for the signed-in user)
  const { data, error } = await supabase
    .from('user_push_tokens')
    .select('token')
    .in('user_id', userIds);

  if (error) {
    return { data: [], error };
  }

  return { data: (data || []).map(d => d.token), error: null };
}
// @ts-nocheck
