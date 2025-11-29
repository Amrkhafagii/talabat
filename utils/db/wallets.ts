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

export async function holdOrderPayment(orderId: string, reference?: string): Promise<{ status: string } | null> {
  const { data, error } = await supabase.rpc('hold_order_payment', { p_order_id: orderId, p_reference: reference ?? null });
  if (error) {
    console.error('Error holding order payment:', error);
    return null;
  }
  return data as any;
}

export async function captureOrderPayment(orderId: string, driverCut?: number): Promise<{ commission: number; driver: number; restaurant: number } | null> {
  const { data, error } = await supabase.rpc('capture_order_payment', { p_order_id: orderId, p_driver_cut: driverCut ?? null });
  if (error) {
    console.error('Error capturing order payment:', error);
    return null;
  }
  return data as any;
}

export async function refundOrderPayment(orderId: string): Promise<{ status: string } | null> {
  const { data, error } = await supabase.rpc('refund_order_payment', { p_order_id: orderId });
  if (error) {
    console.error('Error refunding order payment:', error);
    return null;
  }
  return data as any;
}

export async function payoutDriverDelivery(deliveryId: string): Promise<{ status: string; amount: number } | null> {
  const { data, error } = await supabase.rpc('payout_driver_delivery', { p_delivery_id: deliveryId });
  if (error) {
    console.error('Error paying driver for delivery:', error);
    return null;
  }
  return data as any;
}
