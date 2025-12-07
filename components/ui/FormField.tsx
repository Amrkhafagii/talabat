import React, { useMemo } from 'react';
import { View, Text, TextInput, ViewStyle, TextStyle, StyleProp, TextInputProps } from 'react-native';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  rightElement?: React.ReactNode;
}

export default function FormField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete,
  textContentType,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
  disabled = false,
  rightElement,
}: FormFieldProps<T>) {
  const { colors, spacing, radius, typography, tap } = useRestaurantTheme();

  const styles = useMemo(() => {
    const baseInput: TextStyle = {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: colors.formText,
    };

    return {
      container: { marginBottom: spacing.lg } as ViewStyle,
      label: { ...typography.subhead, color: colors.text, marginBottom: spacing.xs } as TextStyle,
      inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.formSurface,
        borderWidth: 1,
        borderColor: colors.formBorder,
        borderRadius: radius.md,
        minHeight: tap.minHeight,
      } as ViewStyle,
      input: baseInput,
      multilineInput: { paddingTop: spacing.sm, minHeight: 80 } as TextStyle,
      inputWithRightElement: { paddingRight: spacing.sm } as TextStyle,
      inputError: { borderColor: colors.status.error, borderWidth: 1.5 } as ViewStyle,
      inputDisabled: { backgroundColor: colors.formSurfaceAlt, borderColor: colors.border } as ViewStyle,
      rightElement: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm } as ViewStyle,
      errorText: { ...typography.caption, color: colors.status.error, marginTop: spacing.xs, marginLeft: spacing.xs } as TextStyle,
    };
  }, [colors.border, colors.formBorder, colors.formSurface, colors.formSurfaceAlt, colors.formText, colors.status.error, colors.text, radius.md, spacing.lg, spacing.md, spacing.sm, spacing.xs, tap.minHeight, typography.caption, typography.subhead]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={[styles.container, style]}>
          <Text style={styles.label}>{label}</Text>
          <View
            style={[
              styles.inputContainer,
              error ? styles.inputError : undefined,
              disabled ? styles.inputDisabled : undefined,
            ]}
          >
            <TextInput
              style={[
                styles.input,
                multiline ? styles.multilineInput : undefined,
                rightElement ? styles.inputWithRightElement : undefined,
                inputStyle,
              ]}
              placeholder={placeholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry={secureTextEntry}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoComplete={autoComplete}
              textContentType={textContentType}
              autoCorrect={false}
              multiline={multiline}
              numberOfLines={numberOfLines}
              maxLength={maxLength}
              editable={!disabled}
              textAlignVertical={multiline ? 'top' : 'center'}
              placeholderTextColor={colors.formPlaceholder}
            />
            {rightElement && (
              <View style={styles.rightElement}>
                {rightElement}
              </View>
            )}
          </View>
          {error && (
            <Text style={styles.errorText}>{error.message}</Text>
          )}
        </View>
      )}
    />
  );
}
