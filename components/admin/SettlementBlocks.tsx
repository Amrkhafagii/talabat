import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { styles } from '@/styles/adminMetrics';
import { money } from '@/utils/adminUi';
import type { SettlementReport } from '@/utils/db/adminOps';

type Props = {
  settlementReport: SettlementReport | null;
  settlementDays: string;
  onDaysChange?: (v: string) => void;
  onRefresh: () => void;
};

export default function SettlementBlocks({ settlementReport, settlementDays, onDaysChange, onRefresh }: Props) {
  return (
    <View style={styles.card}>
      {onDaysChange && (
        <>
          <Text style={styles.inputLabel}>Days</Text>
          <TextInput
            style={styles.input}
            value={settlementDays}
            onChangeText={onDaysChange}
            keyboardType="numeric"
            placeholder="1"
          />
        </>
      )}
      <TouchableOpacity onPress={onRefresh} style={[styles.button, styles.outlineButton, { marginTop: 8 }]}>
        <Text style={styles.outlineButtonText}>Refresh settlement</Text>
      </TouchableOpacity>
      {settlementReport && (
        <TouchableOpacity
          onPress={() => {
            const payload = JSON.stringify(settlementReport, null, 2);
            Clipboard.setStringAsync(payload);
          }}
          style={[styles.button, styles.outlineButton, { marginTop: 8 }]}
        >
          <Text style={styles.outlineButtonText}>Copy settlement JSON</Text>
        </TouchableOpacity>
      )}
      {settlementReport ? (
        <>
          <Text style={styles.row}>Platform fee collected: {money(settlementReport.platform_fee_collected)}</Text>
          <Text style={styles.row}>Delivery fee pass-through: {money(settlementReport.delivery_fee_pass_through)}</Text>
          <Text style={styles.row}>Tip pass-through: {money(settlementReport.tip_pass_through)}</Text>
          <Text style={styles.row}>Gross collected: {money(settlementReport.gross_collected)}</Text>
          <Text style={styles.row}>Refunds/Void: {money(settlementReport.refunds_voids)}</Text>
          <Text style={styles.row}>Net collected: {money(settlementReport.net_collected)}</Text>
          <Text style={styles.row}>Restaurant payable due: {money(settlementReport.restaurant_payable_due)}</Text>
          <Text style={styles.row}>Driver payable due: {money(settlementReport.driver_payable_due)}</Text>
        </>
      ) : (
        <Text style={styles.row}>No settlement data loaded.</Text>
      )}
    </View>
  );
}
