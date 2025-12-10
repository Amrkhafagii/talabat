import { useCallback, useState } from 'react';

import { getWalletTransactions, submitWalletTopupProof } from '@/utils/database';
import { WalletTransaction } from '@/types/database';

type HistoryFilters = {
  bucket?: WalletTransaction['bucket'];
  direction?: WalletTransaction['direction'];
  status?: WalletTransaction['status'][];
  limit?: number;
};

export function useWalletActions(walletId?: string) {
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async (filters?: HistoryFilters) => {
    if (!walletId) return [] as WalletTransaction[];
    try {
      setLoadingHistory(true);
      const rows = await getWalletTransactions(walletId, filters);
      setHistory(rows);
      return rows;
    } catch (err) {
      console.error('refreshHistory error', err);
      setError('Unable to load wallet activity');
      return [] as WalletTransaction[];
    } finally {
      setLoadingHistory(false);
    }
  }, [walletId]);

  const submitTopupProof = useCallback(async (amount: number, params?: { txnRef?: string; receiptUrl?: string }) => {
    if (!walletId) return null;
    try {
      setSubmittingProof(true);
      setError(null);
      const txnId = await submitWalletTopupProof(walletId, amount, params);
      if (!txnId) {
        setError('Could not submit proof. Please retry.');
        return null;
      }
      await refreshHistory();
      return txnId;
    } catch (err) {
      console.error('submitTopupProof error', err);
      setError('Could not submit proof. Please retry.');
      return null;
    } finally {
      setSubmittingProof(false);
    }
  }, [refreshHistory, walletId]);

  return {
    history,
    loadingHistory,
    submittingProof,
    error,
    refreshHistory,
    submitTopupProof,
  };
}
