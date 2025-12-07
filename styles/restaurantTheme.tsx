import React, { createContext, useContext, useMemo } from 'react';
import { Platform, useWindowDimensions, ViewStyle, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Density = 'compact' | 'regular' | 'spacious';

type RestaurantPalette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceStrong: string;
  formSurface: string;
  formSurfaceAlt: string;
  formBorder: string;
  formPlaceholder: string;
  formText: string;
  border: string;
  borderMuted: string;
  overlay: string;
  text: string;
  secondaryText: string;
  mutedText: string;
  accent: string;
  accentStrong: string;
  accentMuted: string;
  icon: string;
};

type StatusColors = {
  success: string;
  warning: string;
  error: string;
  hold: string;
  info: string;
};

type RestaurantSpacing = {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xl2: number;
};

type RestaurantRadius = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  pill: number;
};

type IconSizes = { sm: number; md: number; lg: number; xl: number };

type RestaurantTypography = {
  title1: TextStyle;
  title2: TextStyle;
  headline: TextStyle;
  body: TextStyle;
  subhead: TextStyle;
  caption: TextStyle;
  button: TextStyle;
  buttonSmall: TextStyle;
};

type RestaurantShadows = {
  card: ViewStyle;
  raised: ViewStyle;
  overlay: ViewStyle;
};

export type RestaurantTheme = {
  colors: RestaurantPalette & { status: StatusColors };
  spacing: RestaurantSpacing;
  radius: RestaurantRadius;
  typography: RestaurantTypography;
  shadows: RestaurantShadows;
  iconSizes: IconSizes;
  tap: { minHeight: number; hitSlop: { top: number; bottom: number; left: number; right: number } };
  insets: ReturnType<typeof useSafeAreaInsets>;
  device: { width: number; density: Density; isSmallScreen: boolean; isTablet: boolean };
  statusBarStyle: 'light' | 'dark';
};

const restaurantDarkPalette: RestaurantPalette = {
  background: '#0F0E0E',
  surface: '#181616',
  surfaceAlt: '#1F1B1A',
  surfaceStrong: '#221E1C',
  formSurface: '#F7F4EE',
  formSurfaceAlt: '#EFE9DE',
  formBorder: '#E5DECF',
  formPlaceholder: '#A89E8F',
  formText: '#1A1A1A',
  border: '#2A2420',
  borderMuted: '#211C19',
  overlay: 'rgba(0, 0, 0, 0.45)',
  text: '#FFFFFF',
  secondaryText: '#D8D5D2',
  mutedText: '#A8A3A0',
  accent: '#FF7A1A',
  accentStrong: '#FF8F36',
  accentMuted: '#F5A25E',
  icon: '#E9E6E3',
};

const statusColors: StatusColors = {
  success: '#34C759',
  warning: '#F5A524',
  error: '#F75555',
  hold: '#C7851A',
  info: '#5AC8FA',
};

const baseSpacing: RestaurantSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xl2: 32,
};

const radius: RestaurantRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

const iconSizes: IconSizes = { sm: 18, md: 20, lg: 24, xl: 28 };

const buildTypography = (palette: RestaurantPalette): RestaurantTypography => ({
  title1: { fontSize: 22, lineHeight: 28, fontFamily: 'Inter-Bold', color: palette.text },
  title2: { fontSize: 18, lineHeight: 24, fontFamily: 'Inter-SemiBold', color: palette.text },
  headline: { fontSize: 17, lineHeight: 22, fontFamily: 'Inter-SemiBold', color: palette.text },
  body: { fontSize: 16, lineHeight: 21, fontFamily: 'Inter-Regular', color: palette.text },
  subhead: { fontSize: 15, lineHeight: 20, fontFamily: 'Inter-Medium', color: palette.secondaryText },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter-Regular', color: palette.mutedText },
  button: { fontSize: 16, lineHeight: 21, fontFamily: 'Inter-SemiBold', color: palette.text },
  buttonSmall: { fontSize: 14, lineHeight: 18, fontFamily: 'Inter-SemiBold', color: palette.text },
});

function scaleSpacing(spacing: RestaurantSpacing, factor: number): RestaurantSpacing {
  return Object.entries(spacing).reduce((acc, [key, value]) => {
    (acc as any)[key] = Math.round((value as number) * factor);
    return acc;
  }, {} as RestaurantSpacing);
}

function buildShadow(elevation: number, opacity = 0.18): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: 'rgba(0, 0, 0, 1)',
      shadowOpacity: opacity,
      shadowRadius: elevation,
      shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
    },
    android: {
      elevation,
      shadowColor: 'rgba(0, 0, 0, 0.35)',
    },
    default: {},
  }) as ViewStyle;
}

const RestaurantThemeContext = createContext<RestaurantTheme | undefined>(undefined);

export function RestaurantThemeProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const density: Density = width < 360 ? 'compact' : width > 768 ? 'spacious' : 'regular';
  const scale = density === 'compact' ? 0.92 : density === 'spacious' ? 1.08 : 1;
  const spacing = scaleSpacing(baseSpacing, scale);
  const typography = useMemo(() => buildTypography(restaurantDarkPalette), []);

  const shadows: RestaurantShadows = useMemo(
    () => ({
      card: buildShadow(8, 0.16),
      raised: buildShadow(12, 0.2),
      overlay: { ...buildShadow(18, 0.28), backgroundColor: restaurantDarkPalette.overlay },
    }),
    []
  );

  const theme = useMemo<RestaurantTheme>(
    () => ({
      colors: { ...restaurantDarkPalette, status: statusColors },
      spacing,
      radius,
      typography,
      shadows,
      iconSizes,
      tap: { minHeight: 44, hitSlop: { top: 12, bottom: 12, left: 12, right: 12 } },
      insets,
      device: { width, density, isSmallScreen: width < 380, isTablet: width >= 768 },
      statusBarStyle: 'light',
    }),
    [density, insets, shadows, spacing, typography, width]
  );

  return <RestaurantThemeContext.Provider value={theme}>{children}</RestaurantThemeContext.Provider>;
}

export function useRestaurantTheme(): RestaurantTheme {
  const ctx = useContext(RestaurantThemeContext);
  if (!ctx) throw new Error('useRestaurantTheme must be used within a RestaurantThemeProvider');
  return ctx;
}
