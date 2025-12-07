import React, { useMemo } from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
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
}: ButtonProps) {
  const { colors, spacing, radius, typography, shadows, tap } = useRestaurantTheme();

  const { containerStyle, labelStyle } = useMemo(() => {
    const sizePadding =
      size === 'small'
        ? { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }
        : size === 'large'
          ? { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }
          : { paddingHorizontal: spacing.lg, paddingVertical: spacing.md };

    const textBase = size === 'small' ? typography.buttonSmall : typography.button;
    const variants: Record<string, { backgroundColor: string; borderColor?: string; textColor: string; shadow?: ViewStyle }> = {
      primary: { backgroundColor: colors.accent, textColor: '#FFFFFF', shadow: shadows.raised },
      secondary: { backgroundColor: colors.surfaceStrong, textColor: colors.text, shadow: shadows.card },
      outline: { backgroundColor: 'transparent', borderColor: colors.accent, textColor: colors.accent, shadow: undefined },
      danger: { backgroundColor: colors.status.error, textColor: '#FFFFFF', shadow: shadows.raised },
    };
    const variantStyles = variants[variant];

    const containerStyle: ViewStyle = {
      borderRadius: radius.lg,
      minHeight: tap.minHeight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: variant === 'outline' ? 2 : 0,
      borderColor: variantStyles.borderColor,
      backgroundColor: variantStyles.backgroundColor,
      opacity: disabled ? 0.6 : 1,
      ...(variantStyles.shadow ?? shadows.card),
      ...sizePadding,
    };

    const labelStyle: TextStyle = { ...textBase, color: variantStyles.textColor };

    return { containerStyle, labelStyle };
  }, [colors, disabled, radius.lg, shadows.card, shadows.raised, size, spacing.lg, spacing.md, spacing.sm, spacing.xl, spacing.xl2, tap.minHeight, typography.button, typography.buttonSmall, variant]);

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
      <Text style={[labelStyle, textStyle]}>
        {loading ? loadingText || 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
}
