import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { getWalletsByUser, getWalletTransactions, getWalletBalances } from '@/utils/db/wallets';
import { getDriverByUserId, updateDriverProfile } from '@/utils/database';
import { Wallet, WalletTransaction, DeliveryDriver } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import { logMutationError } from '@/utils/telemetry';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

export default function DriverWallet() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useRestaurantTheme();
  const { contentPadding } = useDeliveryLayout();
  const styles = useMemo(() => createStyles(theme, contentPadding.horizontal), [theme, contentPadding.horizontal]);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balances, setBalances] = useState<{ available: number; pending: number } | null>(null);
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', iban: '', instapayType: 'account', instapayHandle: '' });
  const [filter, setFilter] = useState<string>('all');
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;
    const driverProfile = await getDriverByUserId(user.id);
    setDriver(driverProfile);
    setBankForm({
      bankName: (driverProfile as any)?.payout_account?.bankName || '',
      accountNumber: (driverProfile as any)?.payout_account?.accountNumber || '',
      iban: (driverProfile as any)?.payout_account?.iban || '',
      instapayType: (driverProfile as any)?.payout_account?.instapayType || 'account',
      instapayHandle: (driverProfile as any)?.payout_account?.instapayHandle || '',
    });

    const userWallets = await getWalletsByUser(user.id);
    const driverWallet = userWallets.find((w) => w.type === 'driver') || userWallets[0] || null;
    setWallet(driverWallet);

    if (driverWallet) {
      const [tx, bal] = await Promise.all([
        getWalletTransactions(driverWallet.id),
        getWalletBalances(driverWallet.id),
      ]);
      setTransactions(tx);
      setBalances(bal);
    } else {
      setTransactions([]);
      setBalances(null);
    }
  };

  const filteredTx =
    filter === 'all' ? transactions : transactions.filter((t) => t.status === filter);

  const handleSaveBank = async () => {
    if (!driver) return;
    if (!bankForm.bankName || !bankForm.accountNumber) {
      Alert.alert('Bank info required', 'Please enter bank name and account number.');
      return;
    }
    try {
      setSavingBank(true);
      const updated = await updateDriverProfile(driver.id, {
        payout_account: {
          bankName: bankForm.bankName,
          accountNumber: bankForm.accountNumber,
          iban: bankForm.iban,
          instapayType: bankForm.instapayType,
          instapayHandle: bankForm.instapayHandle,
          method: bankForm.instapayHandle ? 'instapay' : null,
          handle: bankForm.instapayHandle || null,
          channel: bankForm.instapayHandle ? 'instapay' : null,
          type: bankForm.instapayType || 'account',
        } as any,
      });

      if (updated) {
        setDriver(updated);
        Alert.alert('Saved', 'Payout details saved.');
      } else {
        Alert.alert('Error', 'Failed to save payout details.');
      }
    } catch (err) {
      console.error('Error saving payout details', err);
      logMutationError('driver.wallet.save.failed', { err: String(err) });
      Alert.alert('Error', 'Failed to save payout details.');
    } finally {
      setSavingBank(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return <Icon name="CheckCircle2" size={16} color={theme.colors.success} />;
    if (status === 'pending') return <Icon name="Clock4" size={16} color={theme.colors.accent} />;
    if (status === 'failed') return <Icon name="XCircle" size={16} color={theme.colors.status.error} />;
    return null;
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return theme.colors.success;
    if (status === 'pending') return theme.colors.accent;
    if (status === 'failed') return theme.colors.status.error;
    return theme.colors.textMuted;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Wallet" showBackButton />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Icon name="Wallet" size="xl" color={theme.colors.text} />
            <Text style={styles.balanceLabel}>Current Balance</Text>
          </View>
          <Text style={styles.balanceValue}>{formatCurrency(Number(wallet?.balance ?? 0))}</Text>
          <Text style={styles.balanceSubtext}>
            Available {formatCurrency(Number(balances?.available ?? 0))} • Pending {formatCurrency(Number(balances?.pending ?? 0))}
          </Text>
        </Card>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={styles.txCard}>
          {filteredTx.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet.</Text>
          ) : (
            filteredTx.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txMeta}>
                  <Text style={styles.txTitle}>{tx.reference || `Transaction`}</Text>
                  <Text style={styles.txSub}>
                    {tx.type} • {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: tx.amount >= 0 ? theme.colors.success : theme.colors.status.error }]}>
                    {tx.amount >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(Number(tx.amount)))}
                  </Text>
                  <View style={styles.statusRow}>
                    {statusIcon(tx.status)}
                    <Text style={[styles.statusText, { color: statusColor(tx.status) }]}>{tx.status}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        <Text style={styles.sectionTitle}>Payout Method</Text>
        <Card style={styles.formCard}>
          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            value={bankForm.bankName}
            onChangeText={(text) => setBankForm({ ...bankForm, bankName: text })}
            placeholder="Enter bank name"
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={styles.label}>Account Number</Text>
          <TextInput
            style={styles.input}
            value={bankForm.accountNumber}
            onChangeText={(text) => setBankForm({ ...bankForm, accountNumber: text })}
            placeholder="Enter account number"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="number-pad"
          />
          <Text style={styles.label}>IBAN (optional)</Text>
          <TextInput
            style={styles.input}
            value={bankForm.iban}
            onChangeText={(text) => setBankForm({ ...bankForm, iban: text })}
            placeholder="Enter IBAN"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
          />
          <Text style={styles.label}>Instapay Type</Text>
          <View style={styles.typeRow}>
            {(['account', 'wallet'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, bankForm.instapayType === type && styles.typeChipActive]}
                onPress={() => setBankForm({ ...bankForm, instapayType: type })}
              >
                <Text style={[styles.typeChipText, bankForm.instapayType === type && styles.typeChipTextActive]}>
                  {type === 'account' ? 'Account' : 'Wallet'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Instapay Handle</Text>
          <TextInput
            style={styles.input}
            value={bankForm.instapayHandle}
            onChangeText={(text) => setBankForm({ ...bankForm, instapayHandle: text })}
            placeholder="e.g., +1234567890"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="number-pad"
          />
        </Card>

        <Button
          title={savingBank ? 'Saving...' : 'Save Changes'}
          onPress={handleSaveBank}
          fullWidth
          pill
          disabled={savingBank}
        />

        <Button
          title="View Payout Confirmation"
          onPress={() => router.push('/(tabs)/delivery/payout-confirm' as any)}
          fullWidth
          pill
          variant="secondary"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, horizontal: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: horizontal, paddingBottom: theme.insets.bottom + theme.spacing.lg, gap: theme.spacing.md },
    balanceCard: { padding: theme.spacing.lg, gap: theme.spacing.xs },
    balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    balanceLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    balanceValue: { ...theme.typography.titleXl, color: theme.colors.text },
    balanceSubtext: { ...theme.typography.caption, color: theme.colors.textMuted },
    filterRow: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.pill,
      padding: 4,
    },
    filterChip: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.radius.pill },
    filterChipActive: { backgroundColor: theme.colors.surface, ...theme.shadows.card },
    filterText: { ...theme.typography.body, color: theme.colors.textMuted },
    filterTextActive: { color: theme.colors.text },
    txCard: { padding: theme.spacing.md, gap: theme.spacing.sm },
    txRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
    txMeta: { flex: 1, gap: 2 },
    txTitle: { ...theme.typography.body, color: theme.colors.text },
    txSub: { ...theme.typography.caption, color: theme.colors.textMuted },
    txRight: { alignItems: 'flex-end', gap: 4 },
    txAmount: { ...theme.typography.subhead },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusText: { ...theme.typography.caption },
    emptyText: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
    sectionTitle: { ...theme.typography.subhead, color: theme.colors.text },
    formCard: { padding: theme.spacing.lg, gap: theme.spacing.sm },
    label: { ...theme.typography.caption, color: theme.colors.textMuted },
    input: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      ...theme.typography.body,
      color: theme.colors.text,
    },
    typeRow: { flexDirection: 'row', gap: theme.spacing.sm },
    typeChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
    },
    typeChipActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
    typeChipText: { ...theme.typography.caption, color: theme.colors.text },
    typeChipTextActive: { color: theme.colors.accent },
  });
