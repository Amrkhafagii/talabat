import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';

type IOSListRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  accessory?: React.ReactNode;
  statusChip?: React.ReactNode;
  subtitle?: string;
  disabled?: boolean;
};

export function IOSListRow({ label, value, onPress, destructive, style, icon, accessory, statusChip, subtitle, disabled }: IOSListRowProps) {
  return (
    <TouchableOpacity
      disabled={!onPress || disabled}
      onPress={onPress}
      style={[styles.row, disabled && styles.disabled, style]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.left}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, destructive && styles.destructive]} numberOfLines={1}>{label}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.right}>
        {statusChip}
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {accessory ? accessory : onPress ? <Text style={styles.value}>›</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    paddingVertical: iosSpacing.sm,
    paddingHorizontal: iosSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: iosColors.separator,
  },
  disabled: { opacity: 0.6 },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: iosSpacing.xs },
  right: { flexDirection: 'row', alignItems: 'center', gap: iosSpacing.xs },
  icon: {
    width: 28,
    height: 28,
    borderRadius: iosRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: iosColors.surfaceMuted,
  },
  label: { ...iosTypography.body },
  subtitle: { ...iosTypography.caption, color: iosColors.secondaryText, marginTop: 2 },
  value: { ...iosTypography.subhead, color: iosColors.secondaryText },
  destructive: { color: iosColors.destructive },
});

export default IOSListRow;
