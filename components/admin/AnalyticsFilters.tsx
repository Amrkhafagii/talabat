import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IOSInput } from '@/components/ios/IOSInput';
import { IOSFilterSheet } from '@/components/ios/IOSFilterSheet';
import { iosColors, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { Calendar, Search } from 'lucide-react-native';

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
    <IOSFilterSheet title="Date Range" onApply={onApply}>
      <View style={styles.row}>
        <IOSInput
          placeholder="Oct 1, 2023"
          value={start}
          onChangeText={onChangeStart}
          style={styles.input}
        />
        <Calendar size={18} color={iosColors.secondaryText} />
      </View>
      <View style={styles.row}>
        <IOSInput
          placeholder="Oct 31, 2023"
          value={end}
          onChangeText={onChangeEnd}
          style={styles.input}
        />
        <Calendar size={18} color={iosColors.secondaryText} />
      </View>
      <View style={styles.row}>
        <IOSInput
          placeholder="Search drivers..."
          value={driverFilter}
          onChangeText={onChangeDriver}
          style={styles.input}
        />
        <Search size={18} color={iosColors.secondaryText} />
      </View>
      <View style={styles.row}>
        <IOSInput
          placeholder="Search restaurants..."
          value={restaurantFilter}
          onChangeText={onChangeRestaurant}
          style={styles.input}
        />
        <Search size={18} color={iosColors.secondaryText} />
      </View>
    </IOSFilterSheet>
  );
}

export default AnalyticsFilters;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iosSpacing.xs,
  },
  input: { flex: 1, paddingRight: iosSpacing.md },
});
