import React, { useMemo } from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Badge({ label, tone = 'neutral', style, textStyle }: BadgeProps) {
  const { colors, spacing, radius, typography } = useRestaurantTheme();

  const styles = useMemo(() => {
    const toneColor =
      tone === 'success'
        ? colors.status.success
        : tone === 'warning'
          ? colors.status.warning
          : tone === 'error'
            ? colors.status.error
            : tone === 'info'
              ? colors.status.info
              : colors.textSubtle;

    return {
      container: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: `${toneColor}1A`,
        borderWidth: 1,
        borderColor: `${toneColor}33`,
      } as ViewStyle,
      label: {
        ...typography.caption,
        color: toneColor,
      } as TextStyle,
    };
  }, [colors.status.error, colors.status.info, colors.status.success, colors.status.warning, colors.textSubtle, radius.pill, spacing.sm, spacing.xs, tone, typography.caption]);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </View>
  );
}
