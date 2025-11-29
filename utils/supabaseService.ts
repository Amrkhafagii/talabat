import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Service-role client intended for server-side/edge usage only.
// Do not bundle the service key in client apps.
let serviceSupabase: SupabaseClient<Database> | null = null;

export function getServiceSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (!serviceSupabase) {
    serviceSupabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return serviceSupabase;
}
