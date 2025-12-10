import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ViewStyle, Modal, ScrollView, TextStyle } from 'react-native';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { Icon } from './Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  style?: ViewStyle;
  disabled?: boolean;
}

export default function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = 'Select an option',
  options,
  style,
  disabled = false,
}: FormSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const { colors, spacing, radius, typography, tap, iconSizes } = useRestaurantTheme();

  const styles = useMemo(() => {
    const baseContainer: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.formSurface,
      borderWidth: 1,
      borderColor: colors.formBorder,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minHeight: tap.minHeight,
      gap: spacing.sm,
    };

    return {
      container: { marginBottom: spacing.lg } as ViewStyle,
      label: { ...typography.subhead, color: colors.text, marginBottom: spacing.xs },
      selectContainer: baseContainer,
      selectText: { ...typography.body, color: colors.formText, flex: 1 } as TextStyle,
      placeholderText: { color: colors.formPlaceholder } as TextStyle,
      selectError: { borderColor: colors.status.error, borderWidth: 1.5 } as ViewStyle,
      selectDisabled: { backgroundColor: colors.formSurfaceAlt, borderColor: colors.borderMuted } as ViewStyle,
      selectFocused: { borderColor: colors.primary[500], borderWidth: 1.5, backgroundColor: colors.surface },
      errorText: { ...typography.caption, color: colors.status.error, marginTop: spacing.xs, marginLeft: spacing.xs } as TextStyle,
      modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
      } as ViewStyle,
      modalContent: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        width: '100%',
        maxHeight: '70%',
        borderWidth: 1,
        borderColor: colors.borderMuted,
      } as ViewStyle,
      modalHeader: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderMuted,
      } as ViewStyle,
      modalTitle: { ...typography.title2, textAlign: 'center' } as TextStyle,
      optionsList: { maxHeight: 300 } as ViewStyle,
      optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderMuted,
      } as ViewStyle,
      selectedOption: { backgroundColor: colors.surfaceAlt } as ViewStyle,
      optionText: { ...typography.body, color: colors.text, flex: 1 } as TextStyle,
      selectedOptionText: { color: colors.accentStrong, fontFamily: 'Inter-SemiBold' } as TextStyle,
      chevron: { marginLeft: spacing.sm } as ViewStyle,
      iconSize: iconSizes.md,
    };
  }, [
    colors.accent,
    colors.borderMuted,
    colors.formBorder,
    colors.formPlaceholder,
    colors.formSurface,
    colors.formSurfaceAlt,
    colors.formText,
    colors.overlay,
    colors.primary,
    colors.status.error,
    colors.surface,
    colors.surfaceAlt,
    colors.text,
    iconSizes.md,
    radius.lg,
    radius.xl,
    spacing.lg,
    spacing.md,
    spacing.sm,
    spacing.xs,
    tap.minHeight,
    typography.body,
    typography.caption,
    typography.subhead,
    typography.title2,
  ]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const selectedOption = options.find(option => option.value === value);

        return (
          <View style={[styles.container, style]}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
              style={[
                styles.selectContainer,
                error && styles.selectError,
                disabled && styles.selectDisabled,
                isOpen && !disabled && !error ? styles.selectFocused : undefined,
              ]}
              onPress={() => !disabled && setIsOpen(true)}
              disabled={disabled}
              hitSlop={tap.hitSlop}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen, disabled }}
            >
              <Text
                style={[
                  styles.selectText,
                  !selectedOption && styles.placeholderText,
                ]}
              >
                {selectedOption ? selectedOption.label : placeholder}
              </Text>
              <Icon name="ChevronDown" size={styles.iconSize} color={colors.mutedText} />
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error.message}</Text>}

            <Modal
              visible={isOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setIsOpen(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setIsOpen(false)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{label}</Text>
                  </View>
                  <ScrollView style={styles.optionsList}>
                    {options.map(option => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionItem,
                          value === option.value && styles.selectedOption,
                        ]}
                        onPress={() => {
                          onChange(option.value);
                          setIsOpen(false);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: value === option.value }}
                        hitSlop={tap.hitSlop}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            value === option.value && styles.selectedOptionText,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {value === option.value && (
                          <Icon name="Check" size={styles.iconSize} color={colors.accent} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        );
      }}
    />
  );
}
