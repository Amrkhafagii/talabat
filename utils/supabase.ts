import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://afqbmpfckrpbfjfhshxn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmcWJtcGZja3JwYmZqZmhzaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjM3MDAsImV4cCI6MjA3OTk5OTcwMH0.txTDT45bT-SsnwJCo1EpKdynYTjFFQrr0pD5H9PwEMM";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
