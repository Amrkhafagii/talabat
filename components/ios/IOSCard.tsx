import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosShadow, iosSpacing } from '@/styles/iosTheme';

type IOSCardProps = {
  children: React.ReactNode;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof iosSpacing;
  elevated?: boolean;
};

export function IOSCard({ children, inset = false, style, padding = 'md', elevated = true }: IOSCardProps) {
  return (
    <View
      style={[
        styles.card,
        inset && styles.inset,
        elevated ? iosShadow.card : null,
        { padding: iosSpacing[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: iosColors.surface,
    borderRadius: iosRadius.xl,
    borderWidth: 1,
    borderColor: iosColors.border,
  },
  inset: {
    borderColor: iosColors.border,
    backgroundColor: iosColors.surfaceMuted,
  },
});

export default IOSCard;
