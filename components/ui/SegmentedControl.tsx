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
  const { colors, spacing, radius, typography } = useRestaurantTheme();

  const styles = useMemo(
    () => ({
      container: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.pill,
        padding: spacing.xs,
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderMuted,
      } as ViewStyle,
      chip: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.pill,
      } as ViewStyle,
      chipActive: {
        backgroundColor: colors.primary[100],
        borderColor: colors.primary[500],
        borderWidth: 1,
      } as ViewStyle,
      chipText: {
        ...typography.caption,
        color: colors.textMuted,
      } as TextStyle,
      chipTextActive: {
        color: colors.primary[500],
      } as TextStyle,
    }),
    [colors.borderMuted, colors.primary, colors.surfaceAlt, colors.textMuted, radius.pill, spacing.sm, spacing.xs, typography.caption]
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
