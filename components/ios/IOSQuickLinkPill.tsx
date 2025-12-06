import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosShadow, iosSpacing, iosTypography } from '@/styles/iosTheme';

type IOSQuickLinkPillProps = {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function IOSQuickLinkPill({ label, onPress, icon, style }: IOSQuickLinkPillProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.pill, style]}>
      {icon}
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: iosSpacing.xs,
    paddingHorizontal: iosSpacing.lg,
    paddingVertical: iosSpacing.sm,
    borderRadius: iosRadius.pill,
    backgroundColor: iosColors.primary,
    ...iosShadow.button,
  },
  text: { ...iosTypography.button, color: '#FFFFFF' },
});

export default IOSQuickLinkPill;
