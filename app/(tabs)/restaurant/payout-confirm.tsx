import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';

import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { requestPayout } from '@/utils/database';

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
  const formatMoney = (value: number) => `${currency} ${value.toFixed(2)}`;

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
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={theme.tap.hitSlop}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Payout</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>You will receive</Text>
        <Text style={styles.amount}>{formatMoney(parsedAmount || 0)}</Text>
        <Text style={styles.meta}>Paying to: {methodLabel}</Text>
        <Text style={styles.meta}>From wallet: {currency}</Text>
        <Text style={styles.meta}>Available • {formatMoney(available || 0)}</Text>
        <Text style={styles.meta}>Pending • {formatMoney(pending || 0)}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => router.back()} hitSlop={theme.tap.hitSlop}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primary, !canSubmit && styles.disabled]}
          onPress={handleConfirm}
          disabled={!canSubmit || submitting}
          hitSlop={theme.tap.hitSlop}
        >
          <Text style={styles.buttonText}>{submitting ? 'Submitting...' : 'Confirm & Request'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const isCompact = theme.device.isSmallScreen;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.insets.bottom + theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      ...theme.typography.title2,
      flex: 1,
      textAlign: 'center',
    },
    backText: {
      ...theme.typography.subhead,
      color: theme.colors.accent,
    },
    placeholder: {
      width: 64,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
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
      ...theme.typography.title1,
    },
    meta: {
      ...theme.typography.body,
      color: theme.colors.secondaryText,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      flexWrap: isCompact ? 'wrap' : 'nowrap',
    },
    button: {
      flex: 1,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: theme.tap.minHeight,
      ...theme.shadows.card,
    },
    primary: {
      backgroundColor: theme.colors.accent,
    },
    secondary: {
      backgroundColor: theme.colors.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    disabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...theme.typography.button,
      color: '#FFFFFF',
    },
    secondaryText: {
      color: theme.colors.text,
    },
  });
}
