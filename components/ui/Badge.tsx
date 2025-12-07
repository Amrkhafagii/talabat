import React, { useMemo } from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
  textStyle?: TextStyle;
  backgroundColor?: string;
  textColor?: string;
}

export default function Badge({ label, tone = 'neutral', style, textStyle, backgroundColor, textColor }: BadgeProps) {
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

    const chipText = textColor || toneColor;
    const chipBg = backgroundColor || `${toneColor}1A`;

    return {
      container: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: chipBg,
        borderWidth: 0,
      } as ViewStyle,
      label: {
        ...typography.caption,
        color: chipText,
        fontFamily: 'Inter-SemiBold',
      } as TextStyle,
    };
  }, [backgroundColor, colors.status.error, colors.status.info, colors.status.success, colors.status.warning, colors.textSubtle, radius.pill, spacing.md, spacing.xs, textColor, tone, typography.caption]);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </View>
  );
}
