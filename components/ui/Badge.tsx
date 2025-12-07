import React, { useMemo } from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface BadgeProps {
  text: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'hold';
  size?: 'small' | 'medium';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Badge({
  text,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}: BadgeProps) {
  const { colors, spacing, radius, typography } = useRestaurantTheme();

  const { containerStyle, labelStyle } = useMemo(() => {
    const sizePadding =
      size === 'small'
        ? { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }
        : { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 };

    const baseColorMap: Record<NonNullable<typeof variant>, string> = {
      primary: colors.accent,
      secondary: colors.mutedText,
      success: colors.status.success,
      warning: colors.status.warning,
      danger: colors.status.error,
      hold: colors.status.hold,
    };
    const baseColor = baseColorMap[variant];

    const withOpacity = (hex: string, alpha = 0.16) => {
      const cleaned = hex.replace('#', '');
      const val = Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0');
      return `#${cleaned}${val}`;
    };

    const containerStyle: ViewStyle = {
      borderRadius: radius.sm,
      backgroundColor: withOpacity(baseColor),
      minHeight: 24,
      alignItems: 'center',
      justifyContent: 'center',
      ...sizePadding,
    };

    const labelStyle: TextStyle = {
      ...(size === 'small' ? typography.caption : typography.subhead),
      color: baseColor,
      fontFamily: 'Inter-SemiBold',
    };

    return { containerStyle, labelStyle };
  }, [colors.accent, colors.mutedText, colors.status.error, colors.status.hold, colors.status.success, colors.status.warning, radius.sm, size, spacing.md, spacing.sm, spacing.xs, typography.caption, typography.subhead, variant]);

  return (
    <View style={[containerStyle, style]} accessibilityRole="text">
      <Text style={[labelStyle, textStyle]}>
        {text}
      </Text>
    </View>
  );
}
