import React from 'react';
import { View, Text, Switch, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { iosColors, iosSpacing, iosTypography } from '@/styles/iosTheme';

type IOSToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  helperText?: string;
  style?: StyleProp<ViewStyle>;
};

export function IOSToggleRow({ label, value, onValueChange, disabled, helperText, style }: IOSToggleRowProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: iosColors.separator, true: iosColors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={iosColors.separator}
      />
    </View>
  );
}

type Styles = {
  row: ViewStyle;
  textCol: ViewStyle;
  label: TextStyle;
  helper: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: iosSpacing.xs,
    gap: iosSpacing.sm,
  },
  textCol: { flex: 1 },
  label: { ...iosTypography.body },
  helper: { ...iosTypography.caption, marginTop: 2 },
});

export default IOSToggleRow;
