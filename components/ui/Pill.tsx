import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View, ViewStyle, TextStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface PillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Pill({ label, active = false, onPress, style, textStyle }: PillProps) {
  const { colors, spacing, radius, typography } = useRestaurantTheme();

  const styles = useMemo(
    () => ({
      pill: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.primary[500] : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary[500] : colors.borderMuted,
      } as ViewStyle,
      label: {
        ...typography.caption,
        color: active ? colors.textInverse : colors.textMuted,
        fontFamily: 'Inter-SemiBold',
      } as TextStyle,
    }),
    [active, colors.borderMuted, colors.primary, colors.surface, colors.textInverse, colors.textMuted, radius.pill, spacing.lg, spacing.xs, typography.caption]
  );

  const content = <Text style={[styles.label, textStyle]}>{label}</Text>;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.pill, style]} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.pill, style]}>{content}</View>;
}
