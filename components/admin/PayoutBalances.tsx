import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSBadge } from '@/components/ios/IOSBadge';
import { IOSPillButton } from '@/components/ios/IOSPillButton';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { money } from '@/utils/adminUi';
import type { PayoutBalance, WalletTx } from '@/utils/db/admin';

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
  const sorted = useMemo(() => [...balances].sort(sorters[sort]), [balances, sort]);

  if (balances.length === 0) {
    return <Text style={styles.helperText}>No balances found.</Text>;
  }

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
      {sorted.map((b) => (
        <IOSCard key={`${b.user_id}-${b.wallet_type}`} padding="md" style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{b.wallet_type === 'restaurant' ? 'Restaurant Wallet' : 'Driver Wallet'}</Text>
              <Text style={styles.helperText}>Pending: {money((b as any).pending ?? 0)}</Text>
            </View>
            <IOSBadge label={`Balance ${money(b.balance)}`} tone={(b.balance ?? 0) < 0 ? 'error' : 'info'} />
          </View>
          <Text style={styles.balanceValue}>{money(b.balance)}</Text>
          <Text style={styles.helperText}>Instapay: {b.instapay_handle || '—'} ({b.instapay_channel || 'instapay'})</Text>
          {(b as any)?.status === 'blocked' && (
            <Text style={[styles.helperText, styles.blocked]}>Blocked account. Reason: {(b as any)?.block_reason || 'N/A'}</Text>
          )}
          <View style={styles.actions}>
            <IOSPillButton label="Settle Balance" size="sm" onPress={() => confirmSettle(b)} />
            <IOSPillButton label="View Transactions" variant="ghost" size="sm" onPress={() => onViewTx(b.user_id, b.wallet_type)} />
          </View>
        </IOSCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...iosTypography.headline },
  helperText: { ...iosTypography.caption, color: iosColors.secondaryText },
  card: { marginBottom: iosSpacing.md, borderRadius: iosRadius.xl, gap: iosSpacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceValue: { ...iosTypography.title2 },
  blocked: { color: iosColors.destructive },
  actions: { flexDirection: 'row', gap: iosSpacing.xs, marginTop: iosSpacing.sm },
});
