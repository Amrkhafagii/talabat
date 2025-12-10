import React, { useMemo } from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  pill?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  loadingText,
  style,
  textStyle,
  pill = false,
  fullWidth = false,
  iconLeft,
  iconRight,
}: ButtonProps) {
  const { colors, spacing, radius, typography, shadows, tap } = useRestaurantTheme();

  const { containerStyle, labelStyle } = useMemo(() => {
    const heights: Record<ButtonSize, number> = { small: 44, medium: 52, large: 60 };
    const horizontalPadding: Record<ButtonSize, number> = {
      small: spacing.lg,
      medium: spacing.xl,
      large: spacing.xl2,
    };
    const borderRadius = pill ? radius.pill : radius.cta;
    const baseHeight = heights[size] ?? heights.medium;
    const paddingHorizontal = horizontalPadding[size] ?? spacing.xl;

    const textBase = size === 'small' ? typography.buttonSmall : typography.button;
    const variants: Record<ButtonVariant, { backgroundColor: string; borderColor?: string; textColor: string; shadow?: ViewStyle }> = {
      primary: { backgroundColor: colors.primary[500], textColor: colors.textInverse, shadow: shadows.raised },
      secondary: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft, textColor: colors.accentStrong, shadow: shadows.card },
      ghost: { backgroundColor: 'transparent', borderColor: colors.borderMuted, textColor: colors.text, shadow: undefined },
      outline: { backgroundColor: colors.surface, borderColor: colors.primary[500], textColor: colors.primary[600], shadow: undefined },
      danger: { backgroundColor: colors.statusSoft.error, borderColor: colors.status.error, textColor: colors.status.error, shadow: undefined },
    };
    const variantStyles = variants[variant];

    const containerStyle: ViewStyle = {
      borderRadius,
      minHeight: Math.max(tap.minHeight, baseHeight),
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: variantStyles.borderColor ? 1 : 0,
      borderColor: variantStyles.borderColor ?? 'transparent',
      backgroundColor: variantStyles.backgroundColor,
      opacity: disabled ? 0.5 : 1,
      ...(variantStyles.shadow ?? {}),
      paddingHorizontal,
      paddingVertical: spacing.sm,
      width: fullWidth ? '100%' : undefined,
      flexDirection: 'row',
      gap: spacing.xs,
    };

    const labelStyle: TextStyle = { ...textBase, color: variantStyles.textColor };

    return { containerStyle, labelStyle };
  }, [colors, disabled, fullWidth, pill, radius.lg, radius.pill, shadows.card, shadows.raised, size, spacing.lg, spacing.md, spacing.sm, spacing.xl, tap.minHeight, typography.button, typography.buttonSmall, variant, spacing.xs]);

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      hitSlop={tap.hitSlop}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={labelStyle.color} />
      ) : (
        <>
          {iconLeft ? <View>{iconLeft}</View> : null}
          <Text style={[labelStyle, textStyle]}>
            {loading ? loadingText || 'Loading...' : title}
          </Text>
          {iconRight ? <View>{iconRight}</View> : null}
        </>
      )}
    </TouchableOpacity>
  );
}
