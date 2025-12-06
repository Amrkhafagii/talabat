import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet as WalletIcon, Receipt, Shield } from 'lucide-react-native';
import { router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { getWalletsByUser, getWalletTransactions, getDriverByUserId, updateDriverProfile } from '@/utils/database';
import { Wallet, WalletTransaction, DeliveryDriver } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import { logMutationError } from '@/utils/telemetry';

export default function DriverWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', iban: '', instapayType: 'account', instapayHandle: '' });
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;

    try {
      setLoading(true);
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
      const driverWallet = userWallets.find(w => w.type === 'driver') || userWallets[0] || null;
      setWallet(driverWallet);

      if (driverWallet) {
        const tx = await getWalletTransactions(driverWallet.id);
        setTransactions(tx);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading driver wallet:', err);
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
            Driver wallet • {wallet?.currency || 'EGP'}
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
          <Text style={styles.sectionTitle}>Payout Details</Text>
          <View style={styles.kycRow}>
            <Shield size={18} color="#6B7280" />
            <Text style={styles.kycText}>Set payout details to receive earnings.</Text>
          </View>
          <Text style={styles.label}>Bank name</Text>
          <TextInput
            style={styles.input}
            value={bankForm.bankName}
            onChangeText={(text) => setBankForm({ ...bankForm, bankName: text })}
            placeholder="e.g., CIB"
          />
          <Text style={styles.label}>Account number</Text>
          <TextInput
            style={styles.input}
            value={bankForm.accountNumber}
            onChangeText={(text) => setBankForm({ ...bankForm, accountNumber: text })}
            placeholder="Bank account number"
            keyboardType="number-pad"
          />
          <Text style={styles.label}>IBAN (optional)</Text>
          <TextInput
            style={styles.input}
            value={bankForm.iban}
            onChangeText={(text) => setBankForm({ ...bankForm, iban: text })}
            placeholder="IBAN"
            autoCapitalize="characters"
          />
          <Text style={styles.label}>Instapay type</Text>
          <View style={styles.typeRow}>
            {(['account', 'wallet'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  bankForm.instapayType === type && styles.typeChipActive
                ]}
                onPress={() => setBankForm({ ...bankForm, instapayType: type })}
              >
                <Text style={[
                  styles.typeChipText,
                  bankForm.instapayType === type && styles.typeChipTextActive
                ]}>
                  {type === 'account' ? 'Account' : 'Wallet'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Instapay handle</Text>
          <TextInput
            style={styles.input}
            value={bankForm.instapayHandle}
            onChangeText={(text) => setBankForm({ ...bankForm, instapayHandle: text })}
            placeholder="Enter your Instapay handle or number"
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={[styles.saveButton, savingBank && styles.saveButtonDisabled]}
            onPress={handleSaveBank}
            disabled={savingBank}
          >
            <Text style={styles.saveButtonText}>{savingBank ? 'Saving...' : 'Save payout details'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusChip({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <View style={[styles.statusChip, { backgroundColor: `${color}1A`, borderColor: color }]}>
      <Text style={[styles.statusChipText, { color }]}>{label}</Text>
      <Text style={[styles.statusChipCount, { color }]}>{count}</Text>
    </View>
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
  placeholder: { width: 24, height: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280', fontFamily: 'Inter-Regular' },
  content: { padding: 16, gap: 16 },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceLabel: { color: '#6B7280', fontFamily: 'Inter-Medium' },
  balanceValue: { fontSize: 32, fontFamily: 'Inter-SemiBold', color: '#111827' },
  balanceSubtext: { color: '#6B7280', fontFamily: 'Inter-Regular' },
  transactionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#111827' },
  emptyText: { color: '#6B7280', fontFamily: 'Inter-Regular' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txType: { color: '#111827', fontFamily: 'Inter-Medium' },
  txMeta: { color: '#6B7280', fontFamily: 'Inter-Regular', fontSize: 12 },
  txAmount: { fontFamily: 'Inter-SemiBold', fontSize: 16 },
  positive: { color: '#10B981' },
  negative: { color: '#EF4444' },
  statusChips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusChipText: { fontFamily: 'Inter-Medium', fontSize: 12 },
  statusChipCount: { fontFamily: 'Inter-Bold', fontSize: 12 },
  kycRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  kycText: { color: '#6B7280', fontFamily: 'Inter-Regular' },
  label: { fontFamily: 'Inter-Medium', color: '#111827', marginTop: 8 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginTop: 6,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeChipActive: { backgroundColor: '#FFEDD5', borderColor: '#FB923C' },
  typeChipText: { fontFamily: 'Inter-Medium', color: '#111827' },
  typeChipTextActive: { color: '#C2410C' },
  saveButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold', fontSize: 16 },
});
