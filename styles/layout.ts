import { useMemo } from 'react';
import { hp, rf, wp } from './responsive';
import { useRestaurantTheme } from './restaurantTheme';

/**
 * Layout utilities to enforce consistent spacing, gutters, and safe-area-aware paddings.
 */
export function useDeliveryLayout() {
  const theme = useRestaurantTheme();

  const layout = useMemo(() => {
    const horizontal = Math.max(theme.spacing.md, wp('5%'));
    const vertical = Math.max(theme.spacing.lg, hp('2.5%'));
    const contentPadding = {
      horizontal,
      top: vertical,
      bottom: vertical + theme.insets.bottom,
    };

    const sectionGap = Math.max(theme.spacing.lg, wp('4%'));
    const cardGap = Math.max(theme.spacing.md, wp('3%'));

    const responsiveSize = (size: number) => rf(size);

    return { contentPadding, sectionGap, cardGap, responsiveSize };
  }, [theme.insets.bottom, theme.spacing.lg, theme.spacing.md]);

  return { theme, ...layout };
}
