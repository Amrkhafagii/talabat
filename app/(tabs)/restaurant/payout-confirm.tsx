import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';

import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { requestPayout } from '@/utils/database';
import { formatCurrency } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import { wp, hp } from '@/styles/responsive';
import { Icon } from '@/components/ui/Icon';

type Params = {
  walletId?: string;
  amount?: string;
  methodId?: string;
  methodLabel?: string;
  available?: string;
  pending?: string;
  currency?: string;
};

export default function PayoutConfirmScreen() {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<Params>();
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = parseFloat(params.amount || '0');
  const available = parseFloat(params.available || '0');
  const pending = parseFloat(params.pending || '0');
  const methodLabel = params.methodLabel || 'Selected method';
  const currency = params.currency || 'EGP';
  const canSubmit = Boolean(params.walletId && params.methodId && parsedAmount > 0);
  const formatMoney = (value: number) =>
    currency.toUpperCase() === 'EGP' ? formatCurrency(value) : `${currency} ${value.toFixed(2)}`;

  const handleConfirm = async () => {
    if (!canSubmit) {
      Alert.alert('Missing info', 'Payout details are incomplete.');
      return;
    }
    try {
      setSubmitting(true);
      const ok = await requestPayout(String(params.walletId), parsedAmount, { methodId: params.methodId }, params.methodId);
      if (ok) {
        router.replace('/(tabs)/restaurant/wallet');
      } else {
        Alert.alert('Payout failed', 'We could not submit your payout request. Try again.');
      }
    } catch (err) {
      console.error('Error confirming payout', err);
      Alert.alert('Payout failed', 'We could not submit your payout request. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={theme.tap.hitSlop} style={styles.backButton}>
          <Icon name="ArrowLeft" size="md" color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Payout</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.amountCard}>
        <Text style={styles.label}>You will receive</Text>
        <Text style={styles.amount}>{formatMoney(parsedAmount || 0)}</Text>
      </View>

      <View style={styles.detailCard}>
        <View style={styles.detailRow}>
          <Text style={styles.meta}>Paying To</Text>
          <Text style={styles.detailValue}>{methodLabel}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.meta}>From Wallet</Text>
          <Text style={styles.detailValue}>{formatMoney(available || parsedAmount || 0)}</Text>
        </View>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.meta}>Transaction Fee</Text>
          <Text style={styles.detailValue}>{formatMoney(0)}</Text>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <Icon name="AlertCircle" size="md" color={theme.colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>Processing Time</Text>
          <Text style={styles.infoText}>Funds will typically arrive in your bank account within 1-3 business days.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={submitting ? 'Submitting...' : 'Confirm & Request Payout'}
          onPress={handleConfirm}
          disabled={!canSubmit || submitting}
          fullWidth
          pill
        />
        <TouchableOpacity onPress={() => router.back()} hitSlop={theme.tap.hitSlop}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const horizontal = Math.max(theme.spacing.md, wp('5%'));
  const vertical = Math.max(theme.spacing.md, hp('2.5%'));
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: horizontal,
      paddingTop: vertical,
      paddingBottom: theme.insets.bottom + vertical,
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    headerTitle: {
      ...theme.typography.title2,
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 64,
    },
    amountCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      ...theme.shadows.card,
    },
    label: {
      ...theme.typography.subhead,
      color: theme.colors.secondaryText,
    },
    amount: {
      ...theme.typography.titleXl,
    },
    detailCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      ...theme.shadows.card,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderMuted,
    },
    detailValue: {
      ...theme.typography.subhead,
      color: theme.colors.text,
    },
    meta: {
      ...theme.typography.body,
      color: theme.colors.secondaryText,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.accentSoft,
      padding: theme.spacing.md,
    },
    infoTitle: { ...theme.typography.subhead },
    infoText: { ...theme.typography.caption, color: theme.colors.secondaryText, lineHeight: 20 },
    actions: {
      marginTop: vertical,
      gap: theme.spacing.sm,
    },
    cancelText: { ...theme.typography.subhead, color: theme.colors.secondaryText, textAlign: 'center' },
  });
}
