import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet as WalletIcon, Receipt, Shield } from 'lucide-react-native';
import { router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { getWalletsByUser, getWalletTransactions, ensureRestaurantForUser, updateRestaurant, requestPayout } from '@/utils/database';
import { Wallet, WalletTransaction, Restaurant } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import { logMutationError } from '@/utils/telemetry';

export default function RestaurantWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', iban: '', instapayType: 'account', instapayHandle: '' });
  const [payoutAmount, setPayoutAmount] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const rest = await ensureRestaurantForUser(user.id);
      setRestaurant(rest);
      setBankForm({
        bankName: (rest as any)?.payout_account?.bankName || '',
        accountNumber: (rest as any)?.payout_account?.accountNumber || '',
        iban: (rest as any)?.payout_account?.iban || '',
        instapayType: (rest as any)?.payout_account?.instapayType || 'account',
        instapayHandle: (rest as any)?.payout_account?.instapayHandle || '',
      });
      const userWallets = await getWalletsByUser(user.id);
      const restaurantWallet = userWallets.find(w => w.type === 'restaurant') || userWallets[0] || null;
      setWallet(restaurantWallet);

      if (restaurantWallet) {
        const tx = await getWalletTransactions(restaurantWallet.id);
        setTransactions(tx);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading restaurant wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  const handleSaveBank = async () => {
    if (!restaurant) return;
    if (!bankForm.bankName || !bankForm.accountNumber) {
      Alert.alert('Bank info required', 'Please enter bank name and account number.');
      return;
    }
    try {
      setSavingBank(true);
      const { success, error } = await updateRestaurant(restaurant.id, {
        payout_account: bankForm,
        kyc_status: restaurant.kyc_status ?? 'pending',
      } as any);
      if (success) {
        setRestaurant((prev) => (prev ? { ...prev, payout_account: bankForm, kyc_status: 'pending' } : prev));
        Alert.alert('Saved', 'Bank details saved. KYC status set to pending.');
      } else {
        Alert.alert('Error', error || 'Failed to save bank details.');
      }
    } catch (err) {
      console.error('Error saving bank details', err);
      logMutationError('wallet.bank.save.failed', { err: String(err) });
      Alert.alert('Error', 'Failed to save bank details.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!wallet) {
      Alert.alert('No wallet', 'Wallet not found.');
      return;
    }
    const amount = parseFloat(payoutAmount || '0');
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a payout amount greater than 0.');
      return;
    }
    if (wallet.balance < amount) {
      Alert.alert('Insufficient balance', 'Amount exceeds available balance.');
      return;
    }
    try {
      setRequestingPayout(true);
      const ok = await requestPayout(wallet.id, amount, { bank: bankForm.bankName });
      if (ok) {
        Alert.alert('Requested', 'Payout request submitted.');
        setPayoutAmount('');
        await loadWallet();
      } else {
        Alert.alert('Error', 'Failed to submit payout request.');
      }
    } catch (err) {
      console.error('Error requesting payout', err);
      logMutationError('wallet.payout.failed', { err: String(err) });
      Alert.alert('Error', 'Failed to submit payout request.');
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <WalletIcon size={24} color="#FF6B35" />
            <Text style={styles.balanceLabel}>Balance</Text>
          </View>
          <Text style={styles.balanceValue}>
            {wallet ? formatCurrency(wallet.balance) : formatCurrency(0)}
          </Text>
          <Text style={styles.balanceSubtext}>
            Restaurant wallet • {wallet?.currency || 'EGP'} {restaurant ? `• ${restaurant.name}` : ''}
          </Text>
        </View>

        <View style={styles.transactionsCard}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet.</Text>
          ) : (
            <>
              {transactions.map(tx => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <Receipt size={18} color="#6B7280" />
                    <View>
                      <Text style={styles.txType}>{tx.type}</Text>
                      <Text style={styles.txMeta}>
                        {tx.status} • {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, tx.amount >= 0 ? styles.positive : styles.negative]}>
                    {tx.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                  </Text>
                </View>
              ))}
              <View style={styles.statusChips}>
                <StatusChip label="Pending" color="#F59E0B" count={transactions.filter(t => t.status === 'pending').length} />
                <StatusChip label="Failed" color="#EF4444" count={transactions.filter(t => t.status === 'failed').length} />
              </View>
            </>
          )}
        </View>

        <View style={styles.transactionsCard}>
          <Text style={styles.sectionTitle}>Bank & Payouts</Text>
          <View style={styles.kycRow}>
            <Shield size={18} color="#6B7280" />
            <Text style={styles.kycText}>KYC status: {restaurant?.kyc_status || 'not set'}</Text>
          </View>
          <Text style={styles.label}>Bank name</Text>
          <TextInput
            style={styles.input}
            value={bankForm.bankName}
            onChangeText={(v) => setBankForm(prev => ({ ...prev, bankName: v }))}
            placeholder="Bank name"
          />
          <Text style={styles.label}>Account number</Text>
          <TextInput
            style={styles.input}
            value={bankForm.accountNumber}
            onChangeText={(v) => setBankForm(prev => ({ ...prev, accountNumber: v }))}
            placeholder="Account number"
          />
          <Text style={styles.label}>IBAN (optional)</Text>
          <TextInput
            style={styles.input}
            value={bankForm.iban}
            onChangeText={(v) => setBankForm(prev => ({ ...prev, iban: v }))}
            placeholder="IBAN"
          />

          <Text style={styles.label}>Instapay type</Text>
          <View style={styles.typeRow}>
            {(['account', 'wallet'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, bankForm.instapayType === type && styles.typeChipActive]}
                onPress={() => setBankForm(prev => ({ ...prev, instapayType: type }))}
              >
                <Text style={[styles.typeChipText, bankForm.instapayType === type && styles.typeChipTextActive]}>
                  {type === 'account' ? 'Account' : 'Wallet'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Instapay number</Text>
          <TextInput
            style={styles.input}
            value={bankForm.instapayHandle}
            onChangeText={(v) => setBankForm(prev => ({ ...prev, instapayHandle: v }))}
            placeholder="Instapay account or wallet number"
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveBank} disabled={savingBank}>
            <Text style={styles.primaryButtonText}>{savingBank ? 'Saving...' : 'Save bank details'}</Text>
          </TouchableOpacity>

          <View style={styles.payoutRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Payout amount</Text>
              <TextInput
                style={styles.input}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="decimal-pad"
                placeholder="Amount"
              />
              <Text style={styles.helpText}>Max: {formatCurrency(wallet?.balance || 0)}</Text>
            </View>
            <TouchableOpacity style={[styles.primaryButton, styles.requestButton]} onPress={handleRequestPayout} disabled={requestingPayout}>
              <Text style={styles.primaryButtonText}>{requestingPayout ? 'Requesting...' : 'Request Payout'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helpText}>Payouts are processed next business day after KYC approval.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#111827' },
  placeholder: { width: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 16, color: '#6B7280', fontFamily: 'Inter-Regular', marginTop: 12 },
  content: { padding: 20, gap: 16 },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceLabel: { fontFamily: 'Inter-Medium', color: '#6B7280' },
  balanceValue: { fontSize: 28, fontFamily: 'Inter-Bold', color: '#111827' },
  balanceSubtext: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12 },
  transactionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#111827', marginBottom: 8 },
  emptyText: { fontFamily: 'Inter-Regular', color: '#6B7280' },
  statusChips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txType: { fontFamily: 'Inter-Medium', color: '#111827' },
  txMeta: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12 },
  txAmount: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  positive: { color: '#10B981' },
  negative: { color: '#EF4444' },
  kycRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  kycText: { fontFamily: 'Inter-Regular', color: '#374151' },
  label: { fontFamily: 'Inter-Medium', color: '#374151', marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  payoutRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 12 },
  requestButton: { flex: 1 },
  helpText: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chipDot: { fontFamily: 'Inter-Bold', marginRight: 4 },
  chipText: { fontFamily: 'Inter-Medium' },
  typeRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  typeChipActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF7ED',
  },
  typeChipText: { fontFamily: 'Inter-Medium', color: '#374151' },
  typeChipTextActive: { color: '#C2410C' },
});

function StatusChip({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <View style={[styles.chip, { backgroundColor: `${color}1A` }]}>
      <Text style={[styles.chipDot, { color }]}>•</Text>
      <Text style={[styles.chipText, { color }]}>{label}: {count}</Text>
    </View>
  );
}
