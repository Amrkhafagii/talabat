import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextStyle, StyleProp, TextInputProps } from 'react-native';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';

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
              placeholderTextColor="#9CA3AF"
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  multilineInput: {
    paddingTop: 12,
    minHeight: 80,
  },
  inputWithRightElement: {
    paddingRight: 8,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  rightElement: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter-Medium',
    marginTop: 6,
    marginLeft: 4,
  },
});
