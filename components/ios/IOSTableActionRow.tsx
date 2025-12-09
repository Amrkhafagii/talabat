import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';

type IOSTableActionRowProps = {
  title: string;
  meta?: string;
  leftLabel?: string;
  rightLabel?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function IOSTableActionRow({
  title,
  meta,
  leftLabel = 'Approve',
  rightLabel = 'Reject',
  onLeftPress,
  onRightPress,
  style,
}: IOSTableActionRowProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onLeftPress}
          style={[styles.button, styles.approve]}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{leftLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRightPress}
          style={[styles.button, styles.reject]}
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, styles.rejectText]}>{rightLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: iosSpacing.sm,
    paddingHorizontal: iosSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: iosColors.separator,
    gap: iosSpacing.sm,
  },
  textCol: { flex: 1, gap: iosSpacing.xxs },
  title: { ...iosTypography.body },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText },
  actions: { flexDirection: 'row', gap: iosSpacing.xs },
  button: {
    paddingHorizontal: iosSpacing.md,
    paddingVertical: iosSpacing.xs,
    borderRadius: iosRadius.md,
    minWidth: 90,
    alignItems: 'center',
  },
  approve: { backgroundColor: iosColors.primary },
  reject: { backgroundColor: iosColors.surfaceAlt, borderWidth: 1, borderColor: iosColors.separator },
  buttonText: { ...iosTypography.caption, color: iosColors.textInverse, fontWeight: '700' },
  rejectText: { color: iosColors.destructive },
});

export default IOSTableActionRow;
