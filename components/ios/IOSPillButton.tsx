import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography, iosShadow } from '@/styles/iosTheme';

type Variant = 'primary' | 'neutral' | 'destructive' | 'ghost';
type Size = 'xs' | 'sm' | 'md';

type IOSPillButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<Variant, { bg: string; text: string; border: string; shadow?: ViewStyle }> = {
  primary: { bg: iosColors.primary, text: '#FFFFFF', border: iosColors.primary, shadow: iosShadow.button },
  neutral: { bg: iosColors.chipBg, text: iosColors.chipText, border: iosColors.chipBg },
  destructive: { bg: iosColors.destructive, text: '#FFFFFF', border: iosColors.destructive },
  ghost: { bg: 'transparent', text: iosColors.primary, border: iosColors.primary },
};

const sizeStyles: Record<Size, { height: number; padX: number; fontSize: number }> = {
  xs: { height: 32, padX: iosSpacing.sm, fontSize: 13 },
  sm: { height: 36, padX: iosSpacing.md - 2, fontSize: 14 },
  md: { height: 44, padX: iosSpacing.lg, fontSize: 16 },
};

export function IOSPillButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
}: IOSPillButtonProps) {
  const colors = variantStyles[variant];
  const sz = sizeStyles[size];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      style={[
        styles.base,
        variant === 'ghost' ? styles.ghost : null,
        colors.shadow,
        {
          minHeight: sz.height,
          paddingHorizontal: sz.padX,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors.text, fontSize: sz.fontSize }]}>{label}</Text>
    </TouchableOpacity>
  );
}

type Styles = {
  base: ViewStyle;
  ghost: ViewStyle;
  label: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  base: {
    borderRadius: iosRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: iosSpacing.xs,
  },
  ghost: { backgroundColor: 'transparent' },
  label: {
    ...iosTypography.button,
    letterSpacing: -0.2,
  },
});

export default IOSPillButton;
