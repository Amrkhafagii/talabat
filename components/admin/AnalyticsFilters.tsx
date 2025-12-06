import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { styles } from '@/styles/adminMetrics';

type Props = {
  start: string;
  end: string;
  driverFilter: string;
  restaurantFilter: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  onChangeDriver: (v: string) => void;
  onChangeRestaurant: (v: string) => void;
  onApply: () => void;
};

export function AnalyticsFilters({
  start,
  end,
  driverFilter,
  restaurantFilter,
  onChangeStart,
  onChangeEnd,
  onChangeDriver,
  onChangeRestaurant,
  onApply,
}: Props) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Filters</Text>
      <View style={{ gap: 8 }}>
        <TextInput
          style={styles.input}
          placeholder="Start (YYYY-MM-DD)"
          value={start}
          onChangeText={onChangeStart}
        />
        <TextInput
          style={styles.input}
          placeholder="End (YYYY-MM-DD)"
          value={end}
          onChangeText={onChangeEnd}
        />
        <TextInput
          style={styles.input}
          placeholder="Driver user id (optional)"
          value={driverFilter}
          onChangeText={onChangeDriver}
        />
        <TextInput
          style={styles.input}
          placeholder="Restaurant id (optional)"
          value={restaurantFilter}
          onChangeText={onChangeRestaurant}
        />
        <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={onApply}>
          <Text style={styles.buttonText}>Apply filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default AnalyticsFilters;
