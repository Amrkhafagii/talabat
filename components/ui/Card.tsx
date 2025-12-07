import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
  shadow?: boolean;
  muted?: boolean;
}

export default function Card({
  children,
  style,
  padding,
  margin = 0,
  shadow = true,
  muted = false,
}: CardProps) {
  const { colors, radius, spacing, shadows } = useRestaurantTheme();

  const cardStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: muted ? colors.surfaceAlt : colors.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: muted ? colors.borderMuted : colors.border,
      padding: padding ?? spacing.lg,
      margin: margin ?? 0,
      ...(shadow ? shadows.card : {}),
    }),
    [colors.border, colors.borderMuted, colors.surface, colors.surfaceAlt, margin, muted, padding, radius.card, shadow, shadows.card, spacing.lg]
  );

  return (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );
}
