import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';

import { useAuth } from '@/contexts/AuthContext';
import { getWalletsByUser, getWalletTransactions } from '@/utils/database';
import { Wallet, WalletTransaction } from '@/types/database';
import { formatCurrency } from '@/utils/formatters';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { Icon } from '@/components/ui/Icon';
import { HStack } from '@/components/ui/Stack';

export default function CustomerWallet() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const loadWallet = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [loadWallet, user]);

  const handleTopUp = useCallback(async () => {
    // Launch real Instapay top-up flow; keep proof upload on the dedicated screen
    await Linking.openURL('https://ipn.eg/S/amrkhafagi/instapay/4VH6jb');
  }, []);

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
            <Icon name="ArrowBack" size="xl" color={theme.colors.text} />
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

  const statusColor = (status?: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return theme.colors.status.success;
      case 'failed':
      case 'reversed':
        return theme.colors.status.error;
      case 'pending':
      default:
        return theme.colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="ArrowBack" size="xl" color={theme.colors.text} />
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
        <LinearGradient
          colors={['#FFA341', '#F58220']}
          style={styles.gradientCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>{wallet ? formatCurrency(wallet.balance) : formatCurrency(0)}</Text>
          <Text style={styles.balanceSubtext}>Customer wallet • {wallet?.currency || 'EGP'}</Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.balanceCta} onPress={() => router.push('/customer/payment-proof' as any)}>
              <Icon name="Upload" size="md" color={theme.colors.textInverse} />
              <Text style={styles.balanceCtaText}>Submit Proof</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.balanceCta} onPress={handleTopUp}>
              <Icon name="Plus" size="md" color={theme.colors.textInverse} />
              <Text style={styles.balanceCtaText}>Top Up</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>See all</Text>
            </TouchableOpacity>
          </View>
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
              <HStack key={tx.id} style={styles.txRow} justify="space-between" align="center">
                <HStack style={styles.txLeft} align="center" gap="sm">
                  <Icon name="Receipt" size="sm" color={statusColor(tx.status)} />
                  <View>
                    <Text style={styles.txType}>{tx.type}</Text>
                    <Text style={styles.txMeta}>
                      {tx.status} • {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                    </Text>
                  </View>
                </HStack>
                <Text style={[styles.txAmount, { color: statusColor(tx.status) }]}>
                  {tx.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                </Text>
              </HStack>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
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
    gradientCard: {
      borderRadius: theme.radius.card,
      padding: 20,
      gap: 8,
      ...theme.shadows.card,
    },
    balanceLabel: { fontFamily: 'Inter-Medium', color: theme.colors.textInverse, textTransform: 'uppercase', letterSpacing: 0.5 },
    balanceValue: { fontSize: 34, fontFamily: 'Inter-Bold', color: theme.colors.textInverse },
    balanceSubtext: { fontFamily: 'Inter-Regular', color: theme.colors.textInverse, fontSize: 12, opacity: 0.9 },
    balanceActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    balanceCta: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingVertical: 12,
      borderRadius: theme.radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    balanceCtaText: { fontFamily: 'Inter-SemiBold', color: theme.colors.textInverse },
    transactionsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
    },
    transactionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    linkText: { fontFamily: 'Inter-SemiBold', color: theme.colors.primary[500] },
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
    errorBox: {
      backgroundColor: theme.colors.statusSoft.error,
      borderColor: theme.colors.status.error,
      borderWidth: 1,
      padding: 12,
      borderRadius: theme.radius.md,
      marginBottom: 12,
    },
    errorText: { fontFamily: 'Inter-Regular', color: theme.colors.status.error },
  });
