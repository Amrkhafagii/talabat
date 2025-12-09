import { useMemo } from 'react';
import { hp, wp } from '@/styles/responsive';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export function useResponsiveSpacing() {
  const { spacing, insets, device } = useRestaurantTheme();

  return useMemo(
    () => {
      const baseHorizontal = Math.max(spacing.lg, wp(device.isTablet ? '4%' : '5%'));
      const baseVertical = Math.max(spacing.lg, hp(device.isTablet ? '2%' : '2.5%'));
      return {
        horizontalGutter: baseHorizontal + Math.max(insets.left, insets.right) / 2,
        verticalGutter: baseVertical,
        contentTop: baseVertical + insets.top,
        contentBottom: baseVertical + insets.bottom,
        isSmallScreen: device.isSmallScreen,
        isTablet: device.isTablet,
      };
    },
    [device.isSmallScreen, device.isTablet, insets.bottom, insets.left, insets.right, insets.top, spacing.lg]
  );
}
