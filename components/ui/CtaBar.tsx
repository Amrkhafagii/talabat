import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import Button from './Button';

interface CtaBarProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function CtaBar({ label, onPress, disabled }: CtaBarProps) {
  const { colors, spacing, radius, shadows, insets } = useRestaurantTheme();

  const styles = useMemo(
    () => ({
      container: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.md + insets.bottom,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        ...shadows.card,
      } as ViewStyle,
      button: {
        borderRadius: radius.cta,
      } as ViewStyle,
    }),
    [colors.border, colors.surface, insets.bottom, radius.cta, shadows.card, spacing.lg, spacing.md]
  );

  return (
    <View style={styles.container}>
      <Button
        title={label}
        onPress={onPress}
        variant="primary"
        fullWidth
        pill
        disabled={disabled}
        style={styles.button}
      />
    </View>
  );
}
