import { supabase } from '../supabase';

export async function upsertPushToken(userId: string, token: string, platform?: string) {
  const { error } = await supabase
    .from('user_push_tokens')
    .upsert(
      { user_id: userId, token, platform },
      { onConflict: 'token' }
    );

  if (error) {
    console.error('Error upserting push token:', error);
    return false;
  }
  return true;
}

export async function getPushTokens(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('user_push_tokens')
    .select('token')
    .in('user_id', userIds);

  if (error) {
    console.error('Error fetching push tokens:', error);
    return [];
  }

  return (data || []).map(d => d.token);
}
