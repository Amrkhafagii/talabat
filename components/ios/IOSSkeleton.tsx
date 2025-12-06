import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosSpacing } from '@/styles/iosTheme';

type SkeletonProps = {
  rows?: number;
  style?: StyleProp<ViewStyle>;
};

export function IOSSkeleton({ rows = 3, style }: SkeletonProps) {
  return (
    <View style={[styles.stack, style]}>
      {Array.from({ length: rows }).map((_, idx) => (
        <View key={idx} style={[styles.line, { width: `${80 - idx * 10}%` }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: iosSpacing.xs },
  line: { height: 12, backgroundColor: iosColors.surfaceAlt, borderRadius: iosRadius.sm },
});

export default IOSSkeleton;
