import { supabase } from '../supabase';
import { Wallet, WalletTransaction } from '@/types/database';

export async function getWalletsByUser(userId: string): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching wallets:', error);
    return [];
  }
  return data || [];
}

export async function getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('wallet_id', walletId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching wallet transactions:', error);
    return [];
  }
  return data || [];
}

export async function releaseOrderPayment(orderId: string): Promise<{ commission: number; net: number } | null> {
  const { data, error } = await supabase.rpc('release_order_payment', { p_order_id: orderId });
  if (error) {
    console.error('Error releasing order payment:', error);
    return null;
  }
  return data as any;
}
