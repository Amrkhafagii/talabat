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
  icons: { strokeWidth: number };
  tap: { minHeight: number; hitSlop: { top: number; bottom: number; left: number; right: number } };
  insets: ReturnType<typeof useSafeAreaInsets>;
  device: { width: number; density: Density; isSmallScreen: boolean; isTablet: boolean };
  statusBarStyle: 'light' | 'dark';
  statusBarBackground: string;
  setMode: (mode: ThemeMode) => void;
};

const iconSizes: IconSizes = { sm: 18, md: 20, lg: 22, xl: 24 };

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

function scaleTypography(typography: DeliveryTokens['typography'], factor: number) {
  return Object.entries(typography).reduce((acc, [key, style]) => {
    const fontSize = (style as any).fontSize;
    const lineHeight = (style as any).lineHeight;
    (acc as any)[key] = {
      ...style,
      ...(fontSize ? { fontSize: Math.round(fontSize * factor * 100) / 100 } : {}),
      ...(lineHeight ? { lineHeight: Math.round(lineHeight * factor * 100) / 100 } : {}),
    };
    return acc;
  }, {} as DeliveryTokens['typography']);
}

function scaleIconSizes(sizes: IconSizes, factor: number): IconSizes {
  return Object.entries(sizes).reduce((acc, [key, value]) => {
    (acc as any)[key] = Math.round((value as number) * factor);
    return acc;
  }, {} as IconSizes);
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
  const isSmallScreen = width <= 380;
  const density: Density = isSmallScreen ? 'compact' : width > 768 ? 'spacious' : 'regular';
  const scale = density === 'compact' ? 0.94 : density === 'spacious' ? 1.06 : 1;
  const typeScale = density === 'compact' ? 0.96 : density === 'spacious' ? 1.04 : 1;
  const iconScale = density === 'compact' ? 0.96 : density === 'spacious' ? 1.04 : 1;
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const tokens: DeliveryTokens = mode === 'dark' ? deliveryTokensDark : deliveryTokensLight;
  const spacing = useMemo(() => scaleSpacing(tokens.spacing, scale), [tokens.spacing, scale]);
  const radius = useMemo(() => scaleRadius(tokens.radius, scale), [tokens.radius, scale]);
  const typography = useMemo(() => scaleTypography(tokens.typography, typeScale), [tokens.typography, typeScale]);
  const scaledIcons = useMemo(() => scaleIconSizes(iconSizes, iconScale), [iconScale]);
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
      iconSizes: scaledIcons,
      icons: { strokeWidth: 1.6 },
      tap: { minHeight: 44, hitSlop: { top: 12, bottom: 12, left: 12, right: 12 } },
      insets,
      device: { width, density, isSmallScreen, isTablet: width >= 768 },
      statusBarStyle: mode === 'dark' ? 'light' : 'dark',
      statusBarBackground: tokens.palette.background,
      setMode,
    }),
    [density, insets, isSmallScreen, mode, radius, scaledIcons, shadows, spacing, tokens.palette, typography, width]
  );

  return <RestaurantThemeContext.Provider value={theme}>{children}</RestaurantThemeContext.Provider>;
}

export function useRestaurantTheme(): RestaurantTheme {
  const ctx = useContext(RestaurantThemeContext);
  if (!ctx) throw new Error('useRestaurantTheme must be used within a RestaurantThemeProvider');
  return ctx;
}
