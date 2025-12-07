import { useMemo } from 'react';
import { useRestaurantTheme } from './restaurantTheme';

/**
 * Layout utilities to enforce consistent spacing, gutters, and safe-area-aware paddings.
 */
export function useDeliveryLayout() {
  const theme = useRestaurantTheme();

  const layout = useMemo(() => {
    const horizontal = theme.device.isSmallScreen ? theme.spacing.md : theme.spacing.lg;
    const vertical = theme.spacing.lg;
    const contentPadding = {
      horizontal,
      top: vertical,
      bottom: vertical + theme.insets.bottom,
    };

    const sectionGap = theme.device.isSmallScreen ? theme.spacing.md : theme.spacing.xl;
    const cardGap = theme.device.isSmallScreen ? theme.spacing.md : theme.spacing.lg;

    const responsiveSize = (size: number) => (theme.device.isSmallScreen ? Math.round(size * 0.94) : size);

    return { contentPadding, sectionGap, cardGap, responsiveSize };
  }, [theme.device.isSmallScreen, theme.insets.bottom, theme.spacing.lg, theme.spacing.md, theme.spacing.xl]);

  return { theme, ...layout };
}
