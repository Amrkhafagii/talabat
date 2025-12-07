import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2, Copy } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';
import { useAuth } from '@/contexts/AuthContext';
import { getWalletsByUser, getPayoutConfirmation } from '@/utils/db/wallets';
import { formatCurrency } from '@/utils/formatters';
import * as Clipboard from 'expo-clipboard';

type PayoutRequestRow = {
  id: string;
  amount: number;
  status: string;
  confirmation_number?: string | null;
  eta_text?: string | null;
  method_snapshot?: Record<string, any> | null;
};

export default function PayoutConfirmScreen() {
  const theme = useRestaurantTheme();
  const { contentPadding } = useDeliveryLayout();
  const styles = useMemo(() => createStyles(theme, contentPadding.horizontal), [theme, contentPadding.horizontal]);
  const { user } = useAuth();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const [payout, setPayout] = useState<{ request: PayoutRequestRow; attempts: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const wallets = await getWalletsByUser(user.id);
        const driverWallet = wallets.find((w) => w.type === 'driver') || wallets[0];
        if (!driverWallet) return;
        const latest = await getPayoutConfirmation(driverWallet.id, requestId);
        if (latest) setPayout(latest as any);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestId, user]);

  const handleCopy = () => {
    if (!payout?.request?.confirmation_number) return;
    Clipboard.setStringAsync(payout.request.confirmation_number);
    Alert.alert('Copied', 'Confirmation number copied.');
  };

  const methodLabel =
    payout?.request?.method_snapshot?.method === 'checking'
      ? `Checking •••• ${payout.request.method_snapshot?.last4 ?? ''}`
      : payout?.request?.method_snapshot?.method || 'Payout Method';

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Payout Confirmed" showBackButton />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <CheckCircle2 size={48} color="#10B981" />
        </View>
        <Text style={styles.title}>Payout Confirmed</Text>
        <Text style={styles.amount}>{formatCurrency(Number(payout?.request?.amount ?? 0))}</Text>
        <Text style={styles.subtitle}>Your payout is on its way!</Text>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.iconBadge} />
              <View>
                <Text style={styles.infoTitle}>{methodLabel}</Text>
                <Text style={styles.infoSub}>Payout Method</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={[styles.iconBadge, { backgroundColor: theme.colors.surfaceAlt }]} />
              <View>
                <Text style={styles.infoTitle}>{payout?.request?.eta_text || 'Arriving soon'}</Text>
                <Text style={styles.infoSub}>Processing Time</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={[styles.iconBadge, { backgroundColor: theme.colors.surfaceAlt }]} />
              <View>
                <Text style={styles.infoTitle}>{payout?.request?.confirmation_number || 'Pending'}</Text>
                <Text style={styles.infoSub}>Confirmation Number</Text>
              </View>
            </View>
            {payout?.request?.confirmation_number ? (
              <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
                <Copy size={18} color={theme.colors.accent} />
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>

        <Text style={styles.footerText}>You will receive an email confirmation shortly.</Text>

        <Button
          title="Back to Wallet"
          onPress={() => router.replace('/(tabs)/delivery/wallet' as any)}
          fullWidth
          pill
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, horizontal: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: horizontal, paddingBottom: theme.insets.bottom + theme.spacing.lg, alignItems: 'center', gap: theme.spacing.md },
    iconWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: '#D1FAE5',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    title: { ...theme.typography.titleM, color: theme.colors.text },
    amount: { ...theme.typography.titleXl, color: theme.colors.text },
    subtitle: { ...theme.typography.body, color: theme.colors.textMuted },
    infoCard: { padding: theme.spacing.lg, gap: theme.spacing.sm, alignSelf: 'stretch' },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    infoLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
    iconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt },
    infoTitle: { ...theme.typography.body, color: theme.colors.text },
    infoSub: { ...theme.typography.caption, color: theme.colors.textMuted },
    divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.sm },
    copyButton: { padding: theme.spacing.xs },
    footerText: { ...theme.typography.caption, color: theme.colors.textMuted, textAlign: 'center' },
  });
