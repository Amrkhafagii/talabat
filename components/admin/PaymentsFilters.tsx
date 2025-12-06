import React from 'react';
import { View, Text, TextInput, TouchableOpacity, type LayoutChangeEvent } from 'react-native';
import { styles } from '@/styles/adminMetrics';

export type PaymentFilterState = {
  search: string;
  restaurantId: string;
  minAmount: string;
  maxAmount: string;
  createdAfter: string;
  createdBefore: string;
};

type PaymentsFiltersProps = {
  filter: PaymentFilterState;
  loading?: boolean;
  onChange: (changes: Partial<PaymentFilterState>) => void;
  onRefresh: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
};

export default function PaymentsFilters({ filter, loading, onChange, onRefresh, onLayout }: PaymentsFiltersProps) {
  return (
    <View style={styles.sectionCard} onLayout={onLayout}>
      <Text style={styles.sectionTitle}>Manual review queue</Text>
      <View style={styles.filtersCard}>
        <Text style={styles.inputLabel}>Search (order/txn)</Text>
        <TextInput
          style={styles.input}
          value={filter.search}
          onChangeText={v => onChange({ search: v })}
          placeholder="order id or txn"
          autoCapitalize="none"
        />
        <Text style={styles.inputLabel}>Restaurant ID</Text>
        <TextInput
          style={styles.input}
          value={filter.restaurantId}
          onChangeText={v => onChange({ restaurantId: v })}
          placeholder="restaurant uuid"
          autoCapitalize="none"
        />
        <Text style={styles.inputLabel}>Amount min / max</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={filter.minAmount}
            onChangeText={v => onChange({ minAmount: v })}
            placeholder="min"
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={filter.maxAmount}
            onChangeText={v => onChange({ maxAmount: v })}
            placeholder="max"
            keyboardType="decimal-pad"
          />
        </View>
        <TouchableOpacity style={[styles.button, styles.outlineButton, { marginTop: 10 }]} onPress={onRefresh} disabled={loading}>
          <Text style={styles.outlineButtonText}>{loading ? 'Loading…' : 'Refresh payments'}</Text>
        </TouchableOpacity>
        <Text style={styles.inputLabel}>Created after / before (ISO)</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={filter.createdAfter}
            onChangeText={v => onChange({ createdAfter: v })}
            placeholder="2025-07-01T00:00:00Z"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={filter.createdBefore}
            onChangeText={v => onChange({ createdBefore: v })}
            placeholder="2025-07-08T00:00:00Z"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={[styles.button, styles.outlineButton, { marginTop: 10 }]} onPress={onRefresh}>
          <Text style={styles.outlineButtonText}>Refresh payments</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
