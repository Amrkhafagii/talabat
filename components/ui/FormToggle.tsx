import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface FormToggleProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function FormToggle<T extends FieldValues>({
  control,
  name,
  label,
  description,
  style,
  disabled = false,
}: FormToggleProps<T>) {
  const { colors, spacing, radius, typography, tap, shadows } = useRestaurantTheme();

  const styles = useMemo(() => ({
    container: { marginBottom: spacing.lg } as ViewStyle,
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: tap.minHeight,
    } as ViewStyle,
    toggleDisabled: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderMuted } as ViewStyle,
    toggleInfo: { flex: 1, marginRight: spacing.md } as ViewStyle,
    label: { ...typography.subhead, color: colors.text, marginBottom: spacing.xs },
    description: { ...typography.body, color: colors.secondaryText, lineHeight: 20 },
    toggle: {
      width: 52,
      height: 30,
      borderRadius: 16,
      backgroundColor: '#E0E0E0',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxs,
    } as ViewStyle,
    toggleActive: { backgroundColor: colors.accent } as ViewStyle,
    toggleDisabledState: { backgroundColor: colors.border } as ViewStyle,
    toggleThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
      ...(shadows.card ?? {}),
      transform: [{ translateX: 0 }],
    } as ViewStyle,
    toggleThumbActive: { transform: [{ translateX: 20 }] } as ViewStyle,
    errorText: { ...typography.caption, color: colors.status.error, marginTop: spacing.xs, marginLeft: spacing.xs },
  }), [
    colors.accent,
    colors.border,
    colors.borderMuted,
    colors.secondaryText,
    colors.status.error,
    colors.surface,
    colors.surfaceAlt,
    colors.text,
    radius.lg,
    shadows.card,
    spacing.lg,
    spacing.md,
    spacing.xs,
    spacing.xxs,
    tap.minHeight,
    typography.body,
    typography.caption,
    typography.subhead,
  ]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View style={[styles.container, style]}>
          <TouchableOpacity
            style={[
              styles.toggleContainer,
              disabled && styles.toggleDisabled
            ]}
            onPress={() => !disabled && onChange(!value)}
            disabled={disabled}
            accessibilityRole="switch"
            accessibilityState={{ checked: !!value, disabled }}
            hitSlop={tap.hitSlop}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.label}>{label}</Text>
              {description && (
                <Text style={styles.description}>{description}</Text>
              )}
            </View>
            <View style={[
              styles.toggle,
              value && styles.toggleActive,
              disabled && styles.toggleDisabledState
            ]}>
              <View style={[
                styles.toggleThumb,
                value && styles.toggleThumbActive
              ]} />
            </View>
          </TouchableOpacity>
          
          {error && (
            <Text style={styles.errorText}>{error.message}</Text>
          )}
        </View>
      )}
    />
  );
}
