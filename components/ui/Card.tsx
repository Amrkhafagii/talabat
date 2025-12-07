import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
  shadow?: boolean;
}

export default function Card({
  children,
  style,
  padding = 16,
  margin = 0,
  shadow = true,
}: CardProps) {
  const { colors, radius, spacing, shadows } = useRestaurantTheme();

  const cardStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: padding ?? spacing.lg,
      margin: margin ?? 0,
      ...(shadow ? shadows.card : {}),
    }),
    [colors.border, colors.surface, margin, padding, radius.lg, shadow, shadows.card, spacing.lg]
  );

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}
