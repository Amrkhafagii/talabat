import React, { useMemo } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type LabeledInputProps = TextInputProps & {
  label: string;
  helperText?: string;
  errorText?: string;
};

export default function LabeledInput({ label, helperText, errorText, style, ...props }: LabeledInputProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style, errorText ? styles.inputError : null]}
        placeholderTextColor={theme.colors.formPlaceholder}
        {...props}
      />
      {helperText && !errorText ? <Text style={styles.helper}>{helperText}</Text> : null}
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return {
    container: { marginBottom: theme.spacing.lg },
    label: { ...theme.typography.subhead, color: theme.colors.text, marginBottom: theme.spacing.xs },
    input: {
      backgroundColor: theme.colors.formSurface,
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.formText,
      minHeight: theme.tap.minHeight,
      fontFamily: 'Inter-Regular',
    },
    inputError: { borderColor: theme.colors.status.error },
    helper: { ...theme.typography.caption, color: theme.colors.textSubtle, marginTop: theme.spacing.xs },
    error: { ...theme.typography.caption, color: theme.colors.status.error, marginTop: theme.spacing.xs },
  };
}
