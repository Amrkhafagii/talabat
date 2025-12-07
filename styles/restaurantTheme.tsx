import React, { createContext, useContext, useMemo, useState } from 'react';
import { Platform, useWindowDimensions, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deliveryTokensDark, deliveryTokensLight, DeliveryTokens } from './deliveryTokens';

type Density = 'compact' | 'regular' | 'spacious';
type ThemeMode = 'light' | 'dark';

type IconSizes = { sm: number; md: number; lg: number; xl: number };

export type RestaurantTheme = {
  mode: ThemeMode;
  colors: DeliveryTokens['palette'] & {
    status: { success: string; warning: string; error: string; info: string; hold: string };
  };
  spacing: DeliveryTokens['spacing'];
  radius: DeliveryTokens['radius'];
  typography: DeliveryTokens['typography'];
  shadows: DeliveryTokens['shadows'];
  iconSizes: IconSizes;
  tap: { minHeight: number; hitSlop: { top: number; bottom: number; left: number; right: number } };
  insets: ReturnType<typeof useSafeAreaInsets>;
  device: { width: number; density: Density; isSmallScreen: boolean; isTablet: boolean };
  statusBarStyle: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
};

const iconSizes: IconSizes = { sm: 18, md: 20, lg: 24, xl: 28 };

function scaleSpacing(spacing: DeliveryTokens['spacing'], factor: number) {
  return Object.entries(spacing).reduce((acc, [key, value]) => {
    (acc as any)[key] = Math.round((value as number) * factor);
    return acc;
  }, {} as DeliveryTokens['spacing']);
}

function scaleRadius(radius: DeliveryTokens['radius'], factor: number) {
  return Object.entries(radius).reduce((acc, [key, value]) => {
    (acc as any)[key] = Math.round((value as number) * factor);
    return acc;
  }, {} as DeliveryTokens['radius']);
}

function buildShadow(elevation: number, opacity = 0.14): ViewStyle {
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

export function RestaurantThemeProvider({
  children,
  initialMode = 'light',
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const density: Density = width < 360 ? 'compact' : width > 768 ? 'spacious' : 'regular';
  const scale = density === 'compact' ? 0.94 : density === 'spacious' ? 1.06 : 1;
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const tokens: DeliveryTokens = mode === 'dark' ? deliveryTokensDark : deliveryTokensLight;
  const spacing = useMemo(() => scaleSpacing(tokens.spacing, scale), [tokens.spacing, scale]);
  const radius = useMemo(() => scaleRadius(tokens.radius, scale), [tokens.radius, scale]);
  const typography = tokens.typography;
  const shadows = useMemo(() => {
    // Recreate shadows using platform helpers to keep parity across platforms.
    return {
      card: { ...tokens.shadows.card, ...buildShadow(tokens.shadows.card.elevation ?? 6, 0.08) },
      raised: { ...tokens.shadows.raised, ...buildShadow(tokens.shadows.raised.elevation ?? 10, 0.14) },
    };
  }, [tokens.shadows.card, tokens.shadows.raised]);

  const theme = useMemo<RestaurantTheme>(
    () => ({
      mode,
      colors: {
        ...tokens.palette,
        status: {
          success: tokens.palette.success,
          warning: tokens.palette.warning,
          error: tokens.palette.error,
          info: '#2563EB',
          hold: tokens.palette.warning,
        },
      },
      spacing,
      radius,
      typography,
      shadows,
      iconSizes,
      tap: { minHeight: 44, hitSlop: { top: 12, bottom: 12, left: 12, right: 12 } },
      insets,
      device: { width, density, isSmallScreen: width < 380, isTablet: width >= 768 },
      statusBarStyle: mode === 'dark' ? 'light' : 'dark',
      setMode,
    }),
    [density, insets, mode, radius, shadows, spacing, tokens.palette, typography, width]
  );

  return <RestaurantThemeContext.Provider value={theme}>{children}</RestaurantThemeContext.Provider>;
}

export function useRestaurantTheme(): RestaurantTheme {
  const ctx = useContext(RestaurantThemeContext);
  if (!ctx) throw new Error('useRestaurantTheme must be used within a RestaurantThemeProvider');
  return ctx;
}
