import { supabase } from '../../supabase';

export type SettlementRow = {
  txn_id?: string;
  payment_ref?: string;
  amount: number;
  settlement_date?: string;
  channel?: string;
};

export type PayoutBalance = {
  user_id: string;
  wallet_type: string;
  balance: number;
  instapay_handle: string | null;
  instapay_channel: string | null;
};

export async function listPayoutBalances(): Promise<PayoutBalance[]> {
  const { data, error } = await supabase.rpc('list_payout_balances');
  if (error) {
    console.warn('list_payout_balances error', error);
    return [];
  }
  return data || [];
}

export async function settleWalletBalance(userId: string, walletType: string, instapayHandle?: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('settle_wallet_balance', {
    p_user_id: userId,
    p_wallet_type: walletType,
    p_instapay_handle: instapayHandle ?? null,
  });
  if (error) {
    console.warn('settle_wallet_balance error', error);
    return null;
  }
  return data as number;
}

export type WalletTx = {
  wallet_id: string;
  wallet_type: string;
  amount: number;
  type: string;
  status: string;
  reference: string | null;
  created_at: string;
};

export async function listWalletTransactionsForUser(userId: string, walletType?: string): Promise<WalletTx[]> {
  const { data, error } = await supabase.rpc('list_wallet_transactions_for_user', {
    p_user_id: userId,
    p_wallet_type: walletType ?? null,
    p_limit: 50,
  });
  if (error) {
    console.warn('list_wallet_transactions_for_user error', error);
    return [];
  }
  return data || [];
}

export async function reconcileSettlementImport(rows: SettlementRow[]): Promise<{ ok: true; result: any[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('reconcile_settlement_import', { p_rows: rows as any });
  if (error) {
    console.warn('reconcile_settlement_import error', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, result: (data as any[]) ?? [] };
}
