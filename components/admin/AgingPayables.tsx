import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import type { AgingPayable } from '@/utils/db/adminOps';

type Props = {
  agingHours: string;
  agingPayables: AgingPayable[];
  onHoursChange: (v: string) => void;
  onRefresh: () => void;
};

export default function AgingPayables({ agingHours, agingPayables, onHoursChange, onRefresh }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.inputLabel}>Older than (hours)</Text>
      <TextInput
        style={styles.input}
        value={agingHours}
        onChangeText={onHoursChange}
        keyboardType="numeric"
        placeholder="24"
      />
      <TouchableOpacity onPress={onRefresh} style={[styles.button, styles.outlineButton, { marginTop: 8 }]}>
        <Text style={styles.outlineButtonText}>Refresh aging</Text>
      </TouchableOpacity>
      {agingPayables.length === 0 ? (
        <Text style={styles.row}>No aging payables.</Text>
      ) : (
        agingPayables.slice(0, 10).map(p => (
          <Text key={`${p.order_id}-${p.payable_type}`} style={styles.row}>
            {p.payable_type} • Order {p.order_id.slice(-6).toUpperCase()} • {p.status} • Attempts {p.attempts} • Age {p.age_hours.toFixed(1)}h {p.last_error ? `• ${p.last_error}` : ''}
          </Text>
        ))
      )}
    </View>
  );
}
