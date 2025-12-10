import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Density, hp, rf, sp, useResponsiveDevice } from './responsive';
import { syncIosTheme } from './iosTheme';

export type ThemeMode = 'light' | 'dark';

type PrimaryRamp = { 25?: string; 50: string; 100: string; 500: string; 600: string };
type StatusSet = { success: string; warning: string; error: string; info: string; hold?: string };

type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceStrong: string;
  border: string;
  borderMuted: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  secondaryText: string;
  mutedText: string;
  formSurface: string;
  formSurfaceAlt: string;
  formBorder: string;
  formPlaceholder: string;
  formText: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  positive: string;
  pill: string;
  overlay: string;
};

type Spacing = {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xl2: number;
};

type Radius = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  pill: number;
  card: number;
  cta: number;
};

type ShadowSet = {
  card: ViewStyle;
  raised: ViewStyle;
};

type Typography = {
  title1?: TextStyle;
  title2?: TextStyle;
  titleXl: TextStyle;
  titleL: TextStyle;
  titleM: TextStyle;
  body: TextStyle;
  subhead: TextStyle;
  caption: TextStyle;
  button: TextStyle;
  buttonSmall: TextStyle;
};

export type AppTheme = {
  mode: ThemeMode;
  colors: Palette & {
    primary: PrimaryRamp;
    status: StatusSet;
    statusSoft: StatusSet;
  };
  spacing: Spacing;
  radius: Radius;
  typography: Typography;
  shadows: ShadowSet;
  iconSizes: IconSizes;
  icons: { strokeWidth: number };
  tap: { minHeight: number; hitSlop: { top: number; bottom: number; left: number; right: number } };
  insets: ReturnType<typeof useSafeAreaInsets>;
  device: { width: number; density: Density; isSmallScreen: boolean; isTablet: boolean };
  statusBarStyle: 'light' | 'dark';
  statusBarBackground: string;
  setMode: (mode: ThemeMode) => void;
};

type IconSizes = { sm: number; md: number; lg: number; xl: number };

const primaryRampLight: PrimaryRamp = {
  25: '#FFF9F2',
  50: '#FFE8D6',
  100: '#FFDDB8',
  500: '#F58220',
  600: '#E26F0B',
};
const primaryRampDark: PrimaryRamp = {
  25: '#1E1A16',
  50: '#2C261F',
  100: '#3A3127',
  500: '#FF9C42',
  600: '#F58220',
};

const baseSpacing: Spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 26, xl2: 34 };
const baseRadius: Radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999, card: 20, cta: 18 };
const baseIconSizes: IconSizes = { sm: 16, md: 20, lg: 24, xl: 30 };

const lightPalette: Palette = {
  background: '#F8F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F2ECE3',
  surfaceStrong: '#FFF9F3',
  border: '#E5D9CB',
  borderMuted: '#EDE3D7',
  text: '#1F140C',
  textMuted: '#524437',
  textSubtle: '#74675A',
  textInverse: '#FFFFFF',
  secondaryText: '#382F2B',
  mutedText: '#8A7C6F',
  formSurface: '#FFFFFF',
  formSurfaceAlt: '#F4EEE4',
  formBorder: '#E5D9CB',
  formPlaceholder: '#9B8D80',
  formText: '#22160E',
  accent: primaryRampLight[500],
  accentStrong: primaryRampLight[600],
  accentSoft: primaryRampLight[50],
  success: '#2CB164',
  warning: '#F0A417',
  error: '#D64545',
  info: '#2F6FE4',
  positive: '#2CB164',
  pill: '#F0E5D8',
  overlay: 'rgba(18, 12, 6, 0.08)',
};

const darkPalette: Palette = {
  background: '#15100C',
  surface: '#1D1711',
  surfaceAlt: '#231B14',
  surfaceStrong: '#1F1912',
  border: '#33271D',
  borderMuted: '#3D2F22',
  text: '#F6EDE3',
  textMuted: '#D4C7BA',
  textSubtle: '#B39E8D',
  textInverse: '#1A120C',
  secondaryText: '#E8DDCF',
  mutedText: '#CBB9A8',
  formSurface: '#201910',
  formSurfaceAlt: '#241C13',
  formBorder: '#3D2F22',
  formPlaceholder: '#A38F7D',
  formText: '#F6EDE3',
  accent: primaryRampDark[500],
  accentStrong: primaryRampDark[600],
  accentSoft: primaryRampDark[50],
  success: '#40C37A',
  warning: '#F4B744',
  error: '#F2857A',
  info: '#85AFFF',
  positive: '#40C37A',
  pill: '#2B2118',
  overlay: 'rgba(0,0,0,0.45)',
};

const statusSoftLight: StatusSet = {
  success: '#EAF7EF',
  warning: '#FFF5E5',
  error: '#FFE9E7',
  info: '#E8F0FF',
};

const statusSoftDark: StatusSet = {
  success: 'rgba(34, 197, 94, 0.16)',
  warning: 'rgba(251, 191, 36, 0.16)',
  error: 'rgba(248, 113, 113, 0.16)',
  info: 'rgba(90, 200, 250, 0.16)',
};

const buildShadows = (cardElevation: number, raisedElevation: number): ShadowSet => ({
  card: {
    shadowColor: 'rgba(18, 12, 6, 0.12)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: cardElevation,
  },
  raised: {
    shadowColor: 'rgba(18, 12, 6, 0.16)',
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: raisedElevation,
  },
});

const buildTypography = (textColor: string): Typography => ({
  title1: { fontSize: rf(28), lineHeight: rf(34), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  title2: { fontSize: rf(24), lineHeight: rf(30), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  titleXl: { fontSize: rf(32), lineHeight: rf(38), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  titleL: { fontSize: rf(26), lineHeight: rf(32), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  titleM: { fontSize: rf(18), lineHeight: rf(24), fontFamily: 'Inter-SemiBold', fontWeight: '600', color: textColor },
  body: { fontSize: rf(16), lineHeight: rf(22), fontFamily: 'Inter-Regular', fontWeight: '400', color: textColor },
  subhead: { fontSize: rf(15), lineHeight: rf(21), fontFamily: 'Inter-SemiBold', fontWeight: '600', color: textColor },
  caption: { fontSize: rf(13), lineHeight: rf(18), fontFamily: 'Inter-Medium', fontWeight: '500', color: textColor },
  button: { fontSize: rf(16), lineHeight: rf(20), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  buttonSmall: { fontSize: rf(14), lineHeight: rf(18), fontFamily: 'Inter-SemiBold', fontWeight: '600', color: textColor },
});

const buildSpacing = (): Spacing => ({
  xxs: sp(baseSpacing.xxs),
  xs: sp(baseSpacing.xs),
  sm: sp(baseSpacing.sm),
  md: sp(baseSpacing.md),
  lg: sp(baseSpacing.lg),
  xl: sp(baseSpacing.xl),
  xl2: sp(baseSpacing.xl2),
});

const buildRadius = (): Radius => ({
  sm: sp(baseRadius.sm),
  md: sp(baseRadius.md),
  lg: sp(baseRadius.lg),
  xl: sp(baseRadius.xl),
  pill: baseRadius.pill,
  card: sp(baseRadius.card),
  cta: sp(baseRadius.cta),
});

const buildIconSizes = (): IconSizes => ({
  sm: Math.round(rf(baseIconSizes.sm)),
  md: Math.round(rf(baseIconSizes.md)),
  lg: Math.round(rf(baseIconSizes.lg)),
  xl: Math.round(rf(baseIconSizes.xl)),
});

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

const baseShadows = buildShadows(8, 12);
const AppThemeContext = createContext<AppTheme | undefined>(undefined);

export const appThemeLight = {
  palette: lightPalette,
  primary: primaryRampLight,
  statusSoft: statusSoftLight,
  spacing: baseSpacing,
  radius: baseRadius,
  shadows: baseShadows,
  typography: buildTypography(lightPalette.text),
};

export const appThemeDark = {
  palette: darkPalette,
  primary: primaryRampDark,
  statusSoft: statusSoftDark,
  spacing: baseSpacing,
  radius: baseRadius,
  shadows: baseShadows,
  typography: buildTypography(darkPalette.text),
};

export function AppThemeProvider({ children, initialMode = 'light' }: { children: React.ReactNode; initialMode?: ThemeMode }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const device = useResponsiveDevice();
  const { width, isSmallScreen, isTablet, density } = device;

  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const primary = mode === 'dark' ? primaryRampDark : primaryRampLight;
  const statusSoft = mode === 'dark' ? statusSoftDark : statusSoftLight;

  const spacing = useMemo(buildSpacing, [width]);
  const radius = useMemo(buildRadius, [width]);
  const typography = useMemo(() => buildTypography(palette.text), [palette.text, width]);
  const scaledIcons = useMemo(buildIconSizes, [width]);
  const shadows = useMemo(() => {
    return {
      card: { ...baseShadows.card, ...buildShadow(baseShadows.card.elevation ?? 8, 0.12) },
      raised: { ...baseShadows.raised, ...buildShadow(baseShadows.raised.elevation ?? 12, 0.18) },
    };
  }, []);

  const tapMinHeight = Math.max(48, hp(isTablet ? '4.5%' : '5.5%'));
  const tapHitSlop = sp(12);

  const theme = useMemo<AppTheme>(
    () => ({
      mode,
      colors: {
        ...palette,
        primary,
        status: {
          success: palette.success,
          warning: palette.warning,
          error: palette.error,
          info: palette.info,
          hold: palette.warning,
        },
        statusSoft,
      },
      spacing,
      radius,
      typography,
      shadows,
      iconSizes: scaledIcons,
      icons: { strokeWidth: 1.6 },
      tap: { minHeight: tapMinHeight, hitSlop: { top: tapHitSlop, bottom: tapHitSlop, left: tapHitSlop, right: tapHitSlop } },
      insets,
      device: { width, density, isSmallScreen, isTablet },
      statusBarStyle: mode === 'dark' ? 'light' : 'dark',
      statusBarBackground: palette.background,
      setMode,
    }),
    [density, insets, isSmallScreen, isTablet, mode, palette, radius, scaledIcons, shadows, spacing, tapHitSlop, tapMinHeight, typography, width, primary, statusSoft]
  );

  useEffect(() => {
    // Keep the legacy iOS token surface in sync for admin components.
    syncIosTheme(theme);
  }, [theme]);

  return <AppThemeContext.Provider value={theme}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within an AppThemeProvider');
  return ctx;
}

// Aliases for gradual migration from the restaurant-themed hook/API.
export type { Density as ThemeDensity };
