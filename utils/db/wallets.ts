import { supabase } from '../supabase';
import { Wallet, WalletTransaction, PayoutMethod } from '@/types/database';

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

export async function requestPayout(walletId: string, amount: number, metadata?: Record<string, any>, methodId?: string): Promise<boolean> {
  const { error } = await supabase.from('payout_requests').insert({
    wallet_id: walletId,
    amount: Math.abs(amount),
    status: 'pending',
    metadata: metadata ?? {},
    method_id: methodId ?? null,
  });

  if (error) {
    console.error('Error requesting payout:', error);
    return false;
  }
  return true;
}

export async function getWalletBalances(walletId: string): Promise<{ available: number; pending: number } | null> {
  const { data, error } = await supabase.rpc('get_wallet_balances', { p_wallet_id: walletId });
  if (error) {
    console.error('Error fetching wallet balances', error);
    return null;
  }
  const [row] = (data as any[]) || [];
  return row ?? null;
}

export async function listPayoutMethods(userId: string): Promise<PayoutMethod[]> {
  const { data, error } = await supabase
    .from('payout_methods')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching payout methods', error);
    return [];
  }
  return (data || []) as PayoutMethod[];
}

export async function createPayoutMethod(payload: Omit<PayoutMethod, 'id' | 'created_at'>): Promise<PayoutMethod | null> {
  const { data, error } = await supabase
    .from('payout_methods')
    .insert(payload)
    .select('*')
    .single();
  if (error) {
    console.error('Error creating payout method', error);
    return null;
  }
  return data as PayoutMethod;
}

export async function setDefaultPayoutMethod(userId: string, methodId: string): Promise<boolean> {
  const { error } = await supabase
    .from('payout_methods')
    .update({ is_default: false })
    .eq('user_id', userId);
  if (error) {
    console.error('Error clearing defaults', error);
    return false;
  }
  const { error: setError } = await supabase
    .from('payout_methods')
    .update({ is_default: true })
    .eq('id', methodId)
    .eq('user_id', userId);
  if (setError) {
    console.error('Error setting default payout method', setError);
    return false;
  }
  return true;
}

export async function deletePayoutMethod(methodId: string): Promise<boolean> {
  const { error } = await supabase.from('payout_methods').delete().eq('id', methodId);
  if (error) {
    console.error('Error deleting payout method', error);
    return false;
  }
  return true;
}
