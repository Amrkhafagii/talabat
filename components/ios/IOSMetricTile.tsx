import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosShadow, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSStatusChip, StatusTone } from './IOSStatusChip';

type IOSMetricTileProps = {
  label: string;
  value: string;
  helper?: string;
  deltaLabel?: string;
  deltaTone?: StatusTone;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function IOSMetricTile({ label, value, helper, deltaLabel, deltaTone = 'neutral', icon, style }: IOSMetricTileProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={styles.label}>{label}</Text>
        {deltaLabel ? <IOSStatusChip label={deltaLabel} tone={deltaTone} style={styles.delta} /> : null}
      </View>
      <Text style={styles.value}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: iosColors.surface,
    borderRadius: iosRadius.lg,
    padding: iosSpacing.md,
    gap: iosSpacing.xxs,
    borderWidth: 1,
    borderColor: iosColors.separator,
    ...iosShadow.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: iosSpacing.xs },
  icon: {
    width: 28,
    height: 28,
    borderRadius: iosRadius.pill,
    backgroundColor: iosColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...iosTypography.subhead, flex: 1 },
  delta: { marginLeft: 'auto' },
  value: { ...iosTypography.title2 },
  helper: { ...iosTypography.caption, color: iosColors.secondaryText },
});

export default IOSMetricTile;
