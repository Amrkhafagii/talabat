import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, ViewStyle, TextStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Option<T extends string> = { label: string; value: T };

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = true,
  style,
}: SegmentedControlProps<T>) {
  const { colors, spacing, radius, typography, shadows } = useRestaurantTheme();

  const styles = useMemo(
    () => ({
      container: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.lg,
        padding: spacing.xs,
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
        ...(shadows.card ?? {}),
      } as ViewStyle,
      chip: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
      } as ViewStyle,
      chipActive: {
        backgroundColor: colors.accent,
      } as ViewStyle,
      chipText: {
        ...typography.buttonSmall,
        color: colors.textSubtle,
      } as TextStyle,
      chipTextActive: {
        color: '#FFFFFF',
      } as TextStyle,
    }),
    [colors.accent, colors.border, colors.surfaceAlt, colors.textSubtle, radius.lg, radius.md, shadows.card, spacing.sm, spacing.xs, typography.buttonSmall]
  );

  return (
    <View style={[styles.container, fullWidth ? { width: '100%' } : null, style]}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.9}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
