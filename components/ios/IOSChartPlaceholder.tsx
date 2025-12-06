import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosShadow, iosSpacing, iosTypography } from '@/styles/iosTheme';

type IOSChartPlaceholderProps = {
  label?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function IOSChartPlaceholder({ label = 'Chart placeholder', height = 140, style }: IOSChartPlaceholderProps) {
  return (
    <View style={[styles.card, { height }, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chartArea}>
        <View style={[styles.bar, { width: '60%' }]} />
        <View style={[styles.bar, { width: '80%' }]} />
        <View style={[styles.bar, { width: '40%' }]} />
        <View style={[styles.bar, { width: '70%' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: iosColors.surface,
    borderRadius: iosRadius.lg,
    padding: iosSpacing.md,
    borderWidth: 1,
    borderColor: iosColors.separator,
    ...iosShadow.card,
  },
  label: { ...iosTypography.subhead, marginBottom: iosSpacing.sm, color: iosColors.secondaryText },
  chartArea: { flex: 1, justifyContent: 'space-evenly' },
  bar: { height: 10, borderRadius: iosRadius.bar, backgroundColor: iosColors.surfaceAlt },
});

export default IOSChartPlaceholder;
