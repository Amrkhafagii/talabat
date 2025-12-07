import { useMemo } from 'react';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export function useResponsiveSpacing() {
  const { spacing, insets, device } = useRestaurantTheme();

  return useMemo(
    () => ({
      horizontalGutter: spacing.lg + Math.max(insets.left, insets.right) / 2,
      verticalGutter: spacing.lg,
      contentTop: spacing.lg + insets.top,
      contentBottom: spacing.lg + insets.bottom,
      isSmallScreen: device.isSmallScreen,
      isTablet: device.isTablet,
    }),
    [device.isSmallScreen, device.isTablet, insets.bottom, insets.left, insets.right, insets.top, spacing.lg]
  );
}
