import React, { useMemo } from 'react';
import { Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type ChipVariant = 'neutral' | 'outline' | 'accent';

type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  variant?: ChipVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
};

export default function Chip({ label, active = false, onPress, variant = 'neutral', style, textStyle, leftIcon }: ChipProps) {
  const { colors, spacing, radius, typography, tap, shadows } = useRestaurantTheme();

  const { containerStyle, labelStyle } = useMemo(() => {
    const paletteByVariant: Record<ChipVariant, { bg: string; border?: string; text: string }> = {
      neutral: { bg: colors.surfaceAlt, border: colors.borderMuted, text: colors.textMuted },
      outline: { bg: 'transparent', border: colors.border, text: colors.text },
      accent: { bg: colors.primary[500], text: colors.textInverse },
    };
    const palette = paletteByVariant[variant];
    const activePalette =
      variant === 'accent'
        ? palette
        : { bg: colors.primary[100], border: colors.primary[500], text: colors.primary[500] };

    const background = active ? activePalette.bg : palette.bg;
    const border = active ? activePalette.border : palette.border;
    const textColor = active ? activePalette.text : palette.text;

    const containerStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: background,
      borderWidth: border ? 1 : 0,
      borderColor: border,
      minHeight: tap.minHeight - 6,
      ...(variant === 'accent' || active ? shadows.card : {}),
    };

    const labelStyle: TextStyle = { ...typography.caption, color: textColor, fontFamily: 'Inter-SemiBold' };

    return { containerStyle, labelStyle };
  }, [active, colors.border, colors.borderMuted, colors.primary, colors.surfaceAlt, colors.text, colors.textInverse, colors.textMuted, radius.pill, shadows.card, spacing.md, spacing.xs, tap.minHeight, typography.caption, variant]);

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={tap.hitSlop}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !onPress }}
      activeOpacity={0.85}
    >
      {leftIcon}
      <Text style={[labelStyle, textStyle]} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </TouchableOpacity>
  );
}
