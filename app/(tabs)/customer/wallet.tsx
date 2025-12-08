import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { getWalletsByUser, getWalletTransactions } from '@/utils/database';
import { Wallet, WalletTransaction } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import { useAppTheme } from '@/styles/appTheme';
import { Icon } from '@/components/ui/Icon';

export default function CustomerWallet() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
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
      setError('Unable to load wallet right now. Please pull to refresh.');
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
            <Icon name="ArrowLeft" size="xl" color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
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
          <Icon name="ArrowLeft" size="xl" color={theme.colors.text} />
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
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Icon name="Wallet" size="xl" color={theme.colors.primary[500]} />
            <Text style={styles.balanceLabel}>Balance</Text>
          </View>
          <Text style={styles.balanceValue}>
            {wallet ? formatCurrency(wallet.balance) : formatCurrency(0)}
          </Text>
          <Text style={styles.balanceSubtext}>Customer wallet • {wallet?.currency || 'EGP'}</Text>
          {!wallet && (
            <Text style={styles.emptyText}>No wallet found yet. It will appear after your first transaction.</Text>
          )}
        </View>

        <View style={styles.transactionsCard}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {transactions.length === 0 && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyText}>Your wallet activity will show up here after your first order.</Text>
            </View>
          ) : (
            transactions.map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Icon name="Receipt" size="sm" color={theme.colors.textMuted} />
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

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: theme.colors.text },
    placeholder: { width: 24 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { fontSize: 16, color: theme.colors.textMuted, fontFamily: 'Inter-Regular', marginTop: 12 },
    content: { padding: 20, gap: 16 },
    balanceCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
      ...theme.shadows.card,
    },
    balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    balanceLabel: { fontFamily: 'Inter-Medium', color: theme.colors.textMuted },
    balanceValue: { fontSize: 28, fontFamily: 'Inter-Bold', color: theme.colors.text },
    balanceSubtext: { fontFamily: 'Inter-Regular', color: theme.colors.textMuted, fontSize: 12 },
    transactionsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
    },
    sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginBottom: 8 },
    emptyText: { fontFamily: 'Inter-Regular', color: theme.colors.textMuted },
    emptyState: { gap: 6 },
    emptyTitle: { fontFamily: 'Inter-SemiBold', color: theme.colors.text, fontSize: 14 },
    txRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    txType: { fontFamily: 'Inter-Medium', color: theme.colors.text },
    txMeta: { fontFamily: 'Inter-Regular', color: theme.colors.textMuted, fontSize: 12 },
    txAmount: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: theme.colors.text },
    positive: { color: theme.colors.status.success },
    negative: { color: theme.colors.status.error },
    errorBox: {
      backgroundColor: theme.colors.statusSoft.error,
      borderColor: theme.colors.status.error,
      borderWidth: 1,
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    errorText: { fontFamily: 'Inter-Regular', color: theme.colors.status.error },
  });
