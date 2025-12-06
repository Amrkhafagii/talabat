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

export async function grantDelayCredit(userId: string, amount: number, reason: string): Promise<boolean> {
  const wallets = await getWalletsByUser(userId);
  const customerWallet = wallets.find(w => w.type === 'customer') || wallets[0];
  if (!customerWallet) {
    console.warn('No wallet found for delay credit');
    return false;
  }

  const { error } = await supabase.from('wallet_transactions').insert({
    wallet_id: customerWallet.id,
    amount,
    type: 'deposit',
    status: 'completed',
    reference: reason,
    metadata: { source: 'delay_credit' },
  });

  if (error) {
    console.error('Error granting delay credit:', error);
    return false;
  }

  return true;
}

export async function grantDelayCreditIdempotent(userId: string, amount: number, reason: string, idempotencyKey: string, orderId?: string): Promise<boolean> {
  const wallets = await getWalletsByUser(userId);
  const customerWallet = wallets.find(w => w.type === 'customer') || wallets[0];
  if (!customerWallet) {
    console.warn('No wallet found for delay credit');
    return false;
  }

  const { data: existing, error: existingError } = await supabase
    .from('wallet_transactions')
    .select('id')
    .eq('wallet_id', customerWallet.id)
    .eq('metadata->>idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking existing delay credit:', existingError);
    return false;
  }

  if (existing) {
    return true;
  }

  const { error } = await supabase.from('wallet_transactions').insert({
    wallet_id: customerWallet.id,
    amount,
    type: 'deposit',
    status: 'completed',
    reference: reason,
    order_id: orderId ?? null,
    metadata: { source: 'delay_credit', idempotency_key: idempotencyKey },
  });

  if (error) {
    console.error('Error granting delay credit (idempotent):', error);
    return false;
  }

  return true;
}

export async function requestPayout(walletId: string, amount: number, metadata?: Record<string, any>): Promise<boolean> {
  const { error } = await supabase.from('wallet_transactions').insert({
    wallet_id: walletId,
    amount: -Math.abs(amount),
    type: 'payout_request',
    status: 'pending',
    reference: 'Restaurant payout request',
    metadata: metadata ?? {},
  });

  if (error) {
    console.error('Error requesting payout:', error);
    return false;
  }
  return true;
}
