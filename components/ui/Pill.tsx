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
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.accentSoft : colors.pill,
        borderWidth: active ? 1 : 0,
        borderColor: active ? colors.accent : 'transparent',
      } as ViewStyle,
      label: {
        ...typography.caption,
        color: active ? colors.accent : colors.text,
      } as TextStyle,
    }),
    [active, colors.accent, colors.accentSoft, colors.pill, colors.text, radius.pill, spacing.md, spacing.xs, typography.caption]
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
