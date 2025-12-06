import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '@/styles/adminMetrics';

export type PayoutFilterState = {
  restaurantId: string;
  status: string;
  payoutRef: string;
  createdAfter: string;
  createdBefore: string;
};

export type DriverPayoutFilterState = {
  driverId: string;
  status: string;
  payoutRef: string;
  createdAfter: string;
  createdBefore: string;
};

type PayoutFiltersProps = {
  restaurantFilter: PayoutFilterState;
  driverFilter: DriverPayoutFilterState;
  onChangeRestaurant: (changes: Partial<PayoutFilterState>) => void;
  onChangeDriver: (changes: Partial<DriverPayoutFilterState>) => void;
  onApply: () => void;
};

export default function PayoutFilters({
  restaurantFilter,
  driverFilter,
  onChangeRestaurant,
  onChangeDriver,
  onApply,
}: PayoutFiltersProps) {
  return (
    <View style={styles.filtersCard}>
      <Text style={styles.sectionTitle}>Payout filters</Text>
      <Text style={styles.inputLabel}>Restaurant ID</Text>
      <TextInput
        style={styles.input}
        value={restaurantFilter.restaurantId}
        onChangeText={v => onChangeRestaurant({ restaurantId: v })}
        placeholder="restaurant uuid"
        autoCapitalize="none"
      />
      <Text style={styles.inputLabel}>Restaurant payout status</Text>
      <TextInput
        style={styles.input}
        value={restaurantFilter.status}
        onChangeText={v => onChangeRestaurant({ status: v })}
        placeholder="pending/initiated/paid/failed"
        autoCapitalize="none"
      />
      <Text style={styles.inputLabel}>Restaurant payout ref</Text>
      <TextInput
        style={styles.input}
        value={restaurantFilter.payoutRef}
        onChangeText={v => onChangeRestaurant({ payoutRef: v })}
        placeholder="payout ref"
        autoCapitalize="none"
      />
      <Text style={styles.inputLabel}>Created after (ISO)</Text>
      <TextInput
        style={styles.input}
        value={restaurantFilter.createdAfter}
        onChangeText={v => onChangeRestaurant({ createdAfter: v })}
        placeholder="2025-07-01T00:00:00Z"
        autoCapitalize="none"
      />
      <Text style={styles.inputLabel}>Created before (ISO)</Text>
      <TextInput
        style={styles.input}
        value={restaurantFilter.createdBefore}
        onChangeText={v => onChangeRestaurant({ createdBefore: v })}
        placeholder="2025-07-08T00:00:00Z"
        autoCapitalize="none"
      />
      <Text style={[styles.inputLabel, { marginTop: 12 }]}>Driver ID</Text>
      <TextInput
        style={styles.input}
        value={driverFilter.driverId}
        onChangeText={v => onChangeDriver({ driverId: v })}
        placeholder="driver uuid"
        autoCapitalize="none"
      />
      <Text style={styles.inputLabel}>Driver payout status</Text>
      <TextInput
        style={styles.input}
        value={driverFilter.status}
        onChangeText={v => onChangeDriver({ status: v })}
        placeholder="pending/initiated/paid/failed"
        autoCapitalize="none"
      />
      <Text style={styles.inputLabel}>Driver payout ref</Text>
      <TextInput
        style={styles.input}
        value={driverFilter.payoutRef}
        onChangeText={v => onChangeDriver({ payoutRef: v })}
        placeholder="payout ref"
        autoCapitalize="none"
      />
      <Text style={styles.inputLabel}>Created after (ISO)</Text>
      <TextInput
        style={styles.input}
        value={driverFilter.createdAfter}
        onChangeText={v => onChangeDriver({ createdAfter: v })}
        placeholder="2025-07-01T00:00:00Z"
        autoCapitalize="none"
      />
      <Text style={styles.inputLabel}>Created before (ISO)</Text>
      <TextInput
        style={styles.input}
        value={driverFilter.createdBefore}
        onChangeText={v => onChangeDriver({ createdBefore: v })}
        placeholder="2025-07-08T00:00:00Z"
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={onApply} style={[styles.button, styles.outlineButton, { marginTop: 10 }]}>
        <Text style={styles.outlineButtonText}>Apply filters</Text>
      </TouchableOpacity>
    </View>
  );
}
