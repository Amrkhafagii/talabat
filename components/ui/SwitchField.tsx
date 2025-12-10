import React, { useMemo } from 'react';
import { View, Text, Switch, ViewStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type SwitchFieldProps = {
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  helperText?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function SwitchField({ label, value, onValueChange, helperText, disabled, style }: SwitchFieldProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={theme.colors.textInverse}
        trackColor={{ false: theme.colors.borderMuted, true: theme.colors.primary[500] }}
        disabled={disabled}
      />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return {
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceStrong,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    } as ViewStyle,
    texts: { flex: 1, marginRight: theme.spacing.md },
    label: { ...theme.typography.subhead, color: theme.colors.text },
    helper: { ...theme.typography.caption, color: theme.colors.textSubtle, marginTop: theme.spacing.xs },
  };
}
