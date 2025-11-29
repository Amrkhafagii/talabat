import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet as WalletIcon, Receipt } from 'lucide-react-native';
import { router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { getWalletsByUser, getWalletTransactions } from '@/utils/database';
import { Wallet, WalletTransaction } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';

export default function CustomerWallet() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userWallets = await getWalletsByUser(user.id);
      const customerWallet = userWallets.find(w => w.type === 'customer') || userWallets[0];
      setWallets(customerWallet ? [customerWallet] : []);

      if (customerWallet) {
        const tx = await getWalletTransactions(customerWallet.id);
        setTransactions(tx);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
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

  const wallet = wallets[0];

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
          <Text style={styles.balanceSubtext}>Customer wallet • {wallet?.currency || 'EGP'}</Text>
        </View>

        <View style={styles.transactionsCard}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet.</Text>
          ) : (
            transactions.map(tx => (
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
            ))
          )}
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
});
