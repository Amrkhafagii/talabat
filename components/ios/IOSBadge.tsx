import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

type IOSBadgeProps = {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

const palette: Record<Tone, { bg: string; text: string; border: string }> = {
  neutral: { bg: iosColors.chipBg, text: iosColors.chipText, border: iosColors.chipBg },
  info: { bg: iosColors.infoAlt, text: iosColors.textInverse, border: iosColors.infoAlt },
  success: { bg: iosColors.successAlt, text: iosColors.textInverse, border: iosColors.successAlt },
  warning: { bg: iosColors.warningAlt, text: iosColors.textInverse, border: iosColors.warningAlt },
  error: { bg: iosColors.destructive, text: iosColors.textInverse, border: iosColors.destructive },
};

export function IOSBadge({ label, tone = 'neutral', style }: IOSBadgeProps) {
  const colors = palette[tone] || palette.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xxs,
    borderRadius: iosRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...iosTypography.caption,
    fontWeight: '600',
  },
});

export default IOSBadge;
