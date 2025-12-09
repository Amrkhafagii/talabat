import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/styles/appTheme';

type Props = {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  platformFee: number;
  total: number;
  etaLabel: string | null;
  etaTrusted: boolean;
};

export function CartSummary({ subtotal, deliveryFee, tax, platformFee, total, etaLabel, etaTrusted }: Props) {
  const theme = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      <Text style={styles.sectionHint}>You pay once; includes platform service fee and delivery.</Text>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Platform fee (10%)</Text>
          <Text style={styles.summaryValue}>${platformFee.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
        {etaLabel && (
          <View style={[styles.etaBadge, etaTrusted ? styles.etaTrusted : styles.etaCaution]}>
            <Icon name='ShieldCheck' size={14} color={etaTrusted ? theme.colors.status.success : theme.colors.status.warning} />
            <Text style={[styles.etaText, etaTrusted ? styles.etaTrustedText : styles.etaCautionText]}>
              {etaTrusted ? 'Trusted arrival' : 'Arrival estimate'} • {etaLabel}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      marginBottom: 8,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    summaryContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 12,
    },
    sectionHint: {
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      marginBottom: 6,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    summaryValue: {
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: 'Inter-Medium',
    },
    totalRow: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    totalLabel: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    etaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    etaTrusted: {
      backgroundColor: theme.colors.statusSoft.success,
      borderColor: theme.colors.status.success,
    },
    etaCaution: {
      backgroundColor: theme.colors.statusSoft.warning,
      borderColor: theme.colors.status.warning,
    },
    etaText: {
      fontFamily: 'Inter-Medium',
      fontSize: 13,
      color: theme.colors.text,
    },
    etaTrustedText: {
      color: theme.colors.status.success,
    },
    etaCautionText: {
      color: theme.colors.status.warning,
    },
  });
