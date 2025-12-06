import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

type IOSStatusChipProps = {
  label: string;
  tone?: StatusTone;
  style?: StyleProp<ViewStyle>;
};

const toneMap: Record<StatusTone, { bg: string; text: string; border: string }> = {
  neutral: { bg: iosColors.chipBg, text: iosColors.chipText, border: iosColors.separator },
  info: { bg: iosColors.infoAlt, text: '#FFFFFF', border: iosColors.infoAlt },
  success: { bg: iosColors.successAlt, text: '#FFFFFF', border: iosColors.successAlt },
  warning: { bg: iosColors.warningAlt, text: '#FFFFFF', border: iosColors.warningAlt },
  error: { bg: iosColors.destructive, text: '#FFFFFF', border: iosColors.destructive },
};

export function IOSStatusChip({ label, tone = 'neutral', style }: IOSStatusChipProps) {
  const colors = toneMap[tone] ?? toneMap.neutral;
  return (
    <View style={[styles.base, { backgroundColor: colors.bg, borderColor: colors.border }, style]}>
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 26,
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xxs,
    borderRadius: iosRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { ...iosTypography.caption, fontWeight: '600' },
});

export default IOSStatusChip;
