import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { IOSCard } from './IOSCard';
import { IOSPillButton } from './IOSPillButton';
import { iosColors, iosRadius, iosShadow, iosSpacing, iosTypography } from '@/styles/iosTheme';

type IOSFilterSheetProps = {
  title?: string;
  children: React.ReactNode;
  onApply: () => void;
  applyLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function IOSFilterSheet({ title, children, onApply, applyLabel = 'Apply Filters', style }: IOSFilterSheetProps) {
  return (
    <IOSCard style={[styles.card, style]} padding="md">
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
      <IOSPillButton label={applyLabel} onPress={onApply} variant="primary" size="md" style={styles.cta} />
    </IOSCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: iosRadius.xl,
    ...iosShadow.overlay,
  },
  title: { ...iosTypography.headline, marginBottom: iosSpacing.sm },
  body: { gap: iosSpacing.sm },
  cta: { width: '100%', marginTop: iosSpacing.sm },
});

export default IOSFilterSheet;
