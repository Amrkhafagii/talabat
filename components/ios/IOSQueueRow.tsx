import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSStatusChip, StatusTone } from './IOSStatusChip';

type IOSQueueRowProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  statusLabel?: string;
  statusTone?: StatusTone;
  amount?: string;
  onPress?: () => void;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function IOSQueueRow({
  title,
  subtitle,
  meta,
  statusLabel,
  statusTone = 'neutral',
  amount,
  onPress,
  actionLabel,
  onActionPress,
  style,
}: IOSQueueRowProps) {
  const RowWrapper = onPress ? TouchableOpacity : View;
  return (
    <RowWrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.row, style]}
    >
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      <View style={styles.right}>
        {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        {statusLabel ? <IOSStatusChip label={statusLabel} tone={statusTone} /> : null}
        {actionLabel && onActionPress ? (
          <TouchableOpacity onPress={onActionPress} style={styles.action} activeOpacity={0.8}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </RowWrapper>
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
  },
  left: { flex: 1, gap: iosSpacing.xxs },
  right: { flexDirection: 'row', alignItems: 'center', gap: iosSpacing.xs, marginLeft: iosSpacing.sm },
  title: { ...iosTypography.body },
  subtitle: { ...iosTypography.caption, color: iosColors.secondaryText },
  meta: { ...iosTypography.caption, color: iosColors.tertiaryText },
  amount: { ...iosTypography.subhead, color: iosColors.text },
  action: {
    paddingHorizontal: iosSpacing.md,
    paddingVertical: iosSpacing.xs,
    borderRadius: iosRadius.md,
    backgroundColor: iosColors.primary,
  },
  actionText: { ...iosTypography.caption, color: '#FFFFFF', fontWeight: '600' },
});

export default IOSQueueRow;
