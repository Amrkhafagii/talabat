import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosSpacing, iosTypography } from '@/styles/iosTheme';

type IOSEmptyStateProps = {
  title?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
};

export function IOSEmptyState({ title = 'Nothing here yet', description, style }: IOSEmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: iosSpacing.md, gap: iosSpacing.xs },
  title: { ...iosTypography.subhead, color: iosColors.secondaryText },
  description: { ...iosTypography.caption, color: iosColors.tertiaryText, textAlign: 'center' },
});

export default IOSEmptyState;
