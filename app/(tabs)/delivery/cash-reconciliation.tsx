import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverByUserId } from '@/utils/database';
import {
  getDriverCashSnapshot,
  getDriverCashTransactions,
  reconcileDriverCash,
  reportCashDiscrepancy,
} from '@/utils/db/wallets';
import { formatCurrency } from '@/utils/formatters';

type Reconciliation = {
  id: string;
  cash_on_hand: number;
  pending_reconciliation: number;
  status: string;
  created_at?: string;
};

type CashTx = {
  id: string;
  amount: number;
  type: string;
  reference?: string | null;
  created_at?: string;
  reconciliation_id?: string | null;
};

export default function CashReconciliationScreen() {
  const theme = useRestaurantTheme();
  const { contentPadding } = useDeliveryLayout();
  const styles = useMemo(() => createStyles(theme, contentPadding.horizontal), [theme, contentPadding.horizontal]);
  const { user } = useAuth();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [recs, setRecs] = useState<Reconciliation[]>([]);
  const [txs, setTxs] = useState<CashTx[]>([]);
  const [activeTab, setActiveTab] = useState<'reconcile' | 'history'>(tabParam === 'history' ? 'history' : 'reconcile');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const driver = await getDriverByUserId(user.id);
        setDriverId(driver?.id ?? null);
        if (driver?.id) {
          const [r, t] = await Promise.all([
            getDriverCashSnapshot(driver.id),
            getDriverCashTransactions(driver.id),
          ]);
          setRecs(r as any);
          setTxs(t as any);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const current = recs[0];

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleReconcile = async () => {
    if (!driverId || !current) return;
    const amount = selectedIds.size
      ? txs.filter((t) => selectedIds.has(t.id)).reduce((sum, t) => sum + Number(t.amount), 0)
      : Number(current.pending_reconciliation ?? 0);
    const ok = await reconcileDriverCash(driverId, amount);
    if (ok) {
      Alert.alert('Reconciled', 'Cash reconciliation completed.');
      router.replace('/(tabs)/delivery');
    } else {
      Alert.alert('Error', 'Failed to reconcile.');
    }
  };

  const handleDiscrepancy = async () => {
    if (!driverId || !current) return;
    const ok = await reportCashDiscrepancy({
      driver_id: driverId,
      reconciliation_id: current.id,
      amount: current.pending_reconciliation ?? 0,
      reason: 'driver_reported',
    });
    Alert.alert(ok ? 'Submitted' : 'Error', ok ? 'Discrepancy reported.' : 'Could not report discrepancy.');
  };

  const filteredTx = activeTab === 'reconcile'
    ? txs.filter((t) => !t.reconciliation_id)
    : txs;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Cash Reconciliation" showBackButton />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.summaryCard}>
          <Text style={styles.caption}>Total Cash on Hand</Text>
          <Text style={styles.amount}>{formatCurrency(Number(current?.cash_on_hand ?? 0))}</Text>
          <Text style={styles.subLabel}>Pending Reconciliation</Text>
          <Text style={[styles.amountSmall, { color: theme.colors.accent }]}>{formatCurrency(Number(current?.pending_reconciliation ?? 0))}</Text>
        </Card>

        <View style={styles.tabRow}>
          {(['reconcile', 'history'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'reconcile' ? 'To Reconcile' : 'History'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionLabel}>{filteredTx.length} Transactions</Text>
          {activeTab === 'reconcile' && (
            <TouchableOpacity onPress={() => setSelectedIds(new Set(filteredTx.map((t) => t.id)))}>
              <Text style={[styles.sectionAction, { color: theme.colors.accent }]}>Select All</Text>
            </TouchableOpacity>
          )}
        </View>

        <Card style={styles.listCard}>
          {filteredTx.map((tx) => {
            const selected = selectedIds.has(tx.id);
            return (
              <TouchableOpacity key={tx.id} style={styles.txRow} onPress={() => toggleSelect(tx.id)}>
                <View style={styles.txLeft}>
                  {activeTab === 'reconcile' ? (
                    selected ? (
                      <Icon name="CheckSquare" size="md" color={theme.colors.accent} />
                    ) : (
                      <Icon name="Square" size="md" color={theme.colors.textMuted} />
                    )
                  ) : null}
                  <View style={styles.txMeta}>
                    <Text style={styles.txTitle}>Order ID: {tx.reference || tx.id.slice(-6)}</Text>
                    <Text style={styles.txDate}>{tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}</Text>
                  </View>
                </View>
                <Text style={[styles.txAmount, { color: theme.colors.text }]}>{formatCurrency(Number(tx.amount))}</Text>
              </TouchableOpacity>
            );
          })}
        </Card>

        {activeTab === 'reconcile' && (
          <>
            <Button
              title={`Reconcile ${formatCurrency(
                selectedIds.size
                  ? txs.filter((t) => selectedIds.has(t.id)).reduce((sum, t) => sum + Number(t.amount), 0)
                  : Number(current?.pending_reconciliation ?? 0),
              )}`}
              onPress={handleReconcile}
              fullWidth
              pill
              disabled={!current || loading}
            />
            <TouchableOpacity onPress={handleDiscrepancy} style={styles.discrepancy}>
              <Text style={[styles.sectionAction, { color: theme.colors.accent }]}>Report a Discrepancy</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, horizontal: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: horizontal, paddingBottom: theme.insets.bottom + theme.spacing.lg, gap: theme.spacing.md },
    summaryCard: { padding: theme.spacing.lg, gap: theme.spacing.xs },
    caption: { ...theme.typography.caption, color: theme.colors.textMuted },
    amount: { ...theme.typography.titleL, color: theme.colors.text },
    subLabel: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
    amountSmall: { ...theme.typography.titleM },
    tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, padding: 4 },
    tab: { flex: 1, paddingVertical: theme.spacing.sm, alignItems: 'center', borderRadius: theme.radius.pill },
    tabActive: { backgroundColor: theme.colors.surface, ...theme.shadows.card },
    tabText: { ...theme.typography.body, color: theme.colors.textMuted },
    tabTextActive: { color: theme.colors.text },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.sm },
    sectionLabel: { ...theme.typography.subhead, color: theme.colors.text },
    sectionAction: { ...theme.typography.caption },
    listCard: { padding: theme.spacing.sm, gap: theme.spacing.sm },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceAlt,
    },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
    txMeta: { gap: 2, flexShrink: 1 },
    txTitle: { ...theme.typography.body, color: theme.colors.text },
    txDate: { ...theme.typography.caption, color: theme.colors.textMuted },
    txAmount: { ...theme.typography.subhead },
    discrepancy: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  });
