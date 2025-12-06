import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { money } from '@/utils/adminUi';
import type { PayoutBalance, WalletTx } from '@/utils/db/adminOps';

type Props = {
  balances: PayoutBalance[];
  walletTx: Record<string, WalletTx[]>;
  onSettle: (userId: string, walletType: string, handle?: string | null) => void;
  onViewTx: (userId: string, walletType: string) => void;
};

type SortKey = 'balance' | 'type' | 'age';
const sorters: Record<SortKey, (a: PayoutBalance, b: PayoutBalance) => number> = {
  balance: (a, b) => (b.balance ?? 0) - (a.balance ?? 0),
  type: (a, b) => (a.wallet_type || '').localeCompare(b.wallet_type || ''),
  age: (a, b) => {
    const aDate = new Date((a as any)?.updated_at ?? (a as any)?.created_at ?? 0).getTime();
    const bDate = new Date((b as any)?.updated_at ?? (b as any)?.created_at ?? 0).getTime();
    return bDate - aDate;
  },
};

export function PayoutBalances({ balances, walletTx, onSettle, onViewTx }: Props) {
  const [sort, setSort] = useState<SortKey>('balance');
  if (balances.length === 0) {
    return <Text style={styles.helper}>No balances found.</Text>;
  }
  const sorted = useMemo(() => [...balances].sort(sorters[sort]), [balances, sort]);

  const confirmSettle = (b: PayoutBalance) => {
    if ((b.balance ?? 0) <= 0) {
      Alert.alert('Cannot settle', 'Balance is zero or negative.');
      return;
    }
    Alert.alert(
      'Settle balance?',
      `User ${b.user_id} • ${b.wallet_type} • ${money(b.balance)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settle', style: 'default', onPress: () => onSettle(b.user_id, b.wallet_type, b.instapay_handle) },
      ]
    );
  };

  return (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Balances</Text>
        <View style={styles.sortRow}>
          <Text style={styles.helper}>Sort</Text>
          <TouchableOpacity style={[styles.badge, sort === 'balance' && styles.badgeActive]} onPress={() => setSort('balance')}>
            <Text style={[styles.badgeText, sort === 'balance' && styles.badgeTextActive]}>Balance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.badge, sort === 'type' && styles.badgeActive]} onPress={() => setSort('type')}>
            <Text style={[styles.badgeText, sort === 'type' && styles.badgeTextActive]}>Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.badge, sort === 'age' && styles.badgeActive]} onPress={() => setSort('age')}>
            <Text style={[styles.badgeText, sort === 'age' && styles.badgeTextActive]}>Age</Text>
          </TouchableOpacity>
        </View>
      </View>
      {sorted.map((b) => (
        <View key={`${b.user_id}-${b.wallet_type}`} style={styles.card}>
          <Text style={styles.row}>User: {b.user_id}</Text>
          <Text style={styles.row}>Type: {b.wallet_type}</Text>
          <Text style={styles.row}>Balance: {money(b.balance)}</Text>
          <Text style={styles.row}>Instapay: {b.instapay_handle || '—'} ({b.instapay_channel || 'instapay'})</Text>
          {(b as any)?.status === 'blocked' && (
            <Text style={[styles.row, styles.blocked]}>Blocked account. Reason: {(b as any)?.block_reason || 'N/A'}</Text>
          )}
          {(b as any)?.ledger_events?.length ? (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.txRow}>Recent ledger</Text>
              {(b as any).ledger_events.slice(0, 3).map((evt: any, idx: number) => (
                <Text key={idx} style={styles.txRow}>{evt.created_at}: {evt.type} {money(evt.amount)}</Text>
              ))}
            </View>
          ) : null}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={() => onViewTx(b.user_id, b.wallet_type)}>
              <Text style={styles.btnText}>View tx</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.primary]} onPress={() => confirmSettle(b)}>
              <Text style={[styles.btnText, styles.primaryText]}>Settle</Text>
            </TouchableOpacity>
          </View>
          {walletTx[b.user_id]?.filter(tx => tx.wallet_type === b.wallet_type).slice(0,5).map((tx) => (
            <Text key={tx.created_at+tx.reference} style={styles.txRow}>
              {tx.created_at}: {tx.type} {money(tx.amount)} ({tx.status}) ref:{tx.reference || '—'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#111827' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sortRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  helper: { color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10 },
  row: { color: '#111827', marginBottom: 4 },
  txRow: { color: '#4B5563', fontSize: 12 },
  blocked: { color: '#B91C1C' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E5E7EB' },
  btnText: { color: '#111827', fontWeight: '600' },
  primary: { backgroundColor: '#111827' },
  primaryText: { color: '#fff' },
  badge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  badgeActive: { backgroundColor: '#0F172A' },
  badgeText: { fontWeight: '700', fontSize: 12, color: '#111827' },
  badgeTextActive: { color: '#FFFFFF' },
});
