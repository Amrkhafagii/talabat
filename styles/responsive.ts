import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { heightPercentageToDP as heightToDP, widthPercentageToDP as widthToDP } from 'react-native-responsive-screen';

export type Density = 'compact' | 'regular' | 'spacious';
export type PercentValue = `${number}%` | number;

export type ResponsiveDevice = {
  width: number;
  height: number;
  shortest: number;
  longest: number;
  isLandscape: boolean;
  isSmallScreen: boolean;
  isTablet: boolean;
  density: Density;
};

type ResponsiveBreakpoints<T> = { base: T; phone?: T; tablet?: T; smallPhone?: T };
export type ResponsiveSetting<T> = T | ResponsiveBreakpoints<T>;

const BASE_WIDTH = 390;

const toPercentage = (value: PercentValue) => {
  if (typeof value === 'string') return parseFloat(value.replace('%', ''));
  return value;
};

const toPercentString = (value: number) => `${value}%`;
const toWidthPercent = (size: number) => (size / BASE_WIDTH) * 100;

export const wp = (value: PercentValue) => widthToDP(toPercentString(toPercentage(value)));
export const hp = (value: PercentValue) => heightToDP(toPercentString(toPercentage(value)));

// Responsive font sizing that tracks screen width against a 390pt baseline.
export const rf = (size: number) => widthToDP(toPercentString(toWidthPercent(size)));
// Responsive spacing helper; rounds to whole pixels for consistent gutters.
export const sp = (size: number) => Math.round(widthToDP(toPercentString(toWidthPercent(size))));

export function useResponsiveDevice(): ResponsiveDevice {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const shortest = Math.min(width, height);
    const longest = Math.max(width, height);
    const isTablet = longest >= 900;
    const isSmallScreen = shortest < 360 || longest < 680;
    const density: Density = shortest <= 360 ? 'compact' : shortest >= 414 ? 'spacious' : 'regular';

    return {
      width,
      height,
      shortest,
      longest,
      isLandscape: width > height,
      isSmallScreen,
      isTablet,
      density,
    };
  }, [height, width]);
}

export function resolveResponsiveValue<T>(value: ResponsiveSetting<T>, device: ResponsiveDevice): T {
  if (isResponsiveBreakpoints<T>(value)) {
    if (device.isTablet && value.tablet !== undefined) return value.tablet;
    if (device.isSmallScreen && value.smallPhone !== undefined) return value.smallPhone;
    if (!device.isTablet && value.phone !== undefined) return value.phone;
    return value.base;
  }
  return value as T;
}

export function useResponsiveGutters() {
  const device = useResponsiveDevice();

  return useMemo(() => {
    const horizontal = Math.max(sp(16), wp(device.isTablet ? '4%' : '5%'));
    const vertical = Math.max(sp(16), hp(device.isTablet ? '2%' : '2.5%'));
    return { horizontal, vertical, device };
  }, [device]);
}

function isResponsiveBreakpoints<T>(value: ResponsiveSetting<T>): value is ResponsiveBreakpoints<T> {
  return typeof value === 'object' && value !== null && 'base' in value;
}
