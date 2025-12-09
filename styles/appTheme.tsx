import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hp, rf, sp } from './responsive';
import { syncIosTheme } from './iosTheme';

type Density = 'compact' | 'regular' | 'spacious';
export type ThemeMode = 'light' | 'dark';

type PrimaryRamp = { 50: string; 100: string; 500: string; 600: string };
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

const primaryRampLight: PrimaryRamp = { 50: '#FFF4EC', 100: '#FFE8D6', 500: '#FF6B00', 600: '#FF7A1A' };
const primaryRampDark: PrimaryRamp = { 50: '#1F3B73', 100: '#1F3B73', 500: '#1E3A8A', 600: '#244A9D' };

const baseSpacing: Spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xl2: 32 };
const baseRadius: Radius = { sm: 12, md: 14, lg: 18, xl: 22, pill: 999, card: 18, cta: 20 };
const baseIconSizes: IconSizes = { sm: 18, md: 20, lg: 22, xl: 24 };

const lightPalette: Palette = {
  background: '#F8F6F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  surfaceStrong: '#FFFFFF',
  border: '#E5E4DF',
  borderMuted: '#EAE8E3',
  text: '#1F1F1F',
  textMuted: '#6B7280',
  textSubtle: '#8A8F99',
  textInverse: '#FFFFFF',
  secondaryText: '#6B7280',
  mutedText: '#8A8F99',
  formSurface: '#FFFFFF',
  formSurfaceAlt: '#F3F4F6',
  formBorder: '#E5E4DF',
  formPlaceholder: '#8A8F99',
  formText: '#1F1F1F',
  accent: primaryRampLight[500],
  accentStrong: primaryRampLight[600],
  accentSoft: primaryRampLight[100],
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#D92D20',
  info: '#2563EB',
  positive: '#16A34A',
  pill: '#F0F1F5',
  overlay: 'rgba(0,0,0,0.08)',
};

const darkPalette: Palette = {
  background: '#0F1524',
  surface: '#121A2C',
  surfaceAlt: '#182742',
  surfaceStrong: '#121A2C',
  border: '#1F2A44',
  borderMuted: '#25324D',
  text: '#FFFFFF',
  textMuted: '#9FB3D9',
  textSubtle: '#7E8FB3',
  textInverse: '#FFFFFF',
  secondaryText: '#9FB3D9',
  mutedText: '#7E8FB3',
  formSurface: '#121A2C',
  formSurfaceAlt: '#182742',
  formBorder: '#1F2A44',
  formPlaceholder: '#7E8FB3',
  formText: '#FFFFFF',
  accent: primaryRampDark[500],
  accentStrong: primaryRampDark[600],
  accentSoft: primaryRampDark[50],
  success: '#22C55E',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#5AC8FA',
  positive: '#22C55E',
  pill: '#1C2740',
  overlay: 'rgba(0,0,0,0.45)',
};

const statusSoftLight: StatusSet = {
  success: '#E9F7EE',
  warning: '#FFF7E0',
  error: '#FFE5E5',
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
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: cardElevation,
  },
  raised: {
    shadowColor: 'rgba(0,0,0,0.14)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: raisedElevation,
  },
});

const buildTypography = (textColor: string): Typography => ({
  title1: { fontSize: rf(24), lineHeight: rf(30), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  title2: { fontSize: rf(20), lineHeight: rf(26), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  titleXl: { fontSize: rf(28), lineHeight: rf(34), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  titleL: { fontSize: rf(24), lineHeight: rf(30), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  titleM: { fontSize: rf(20), lineHeight: rf(26), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  body: { fontSize: rf(16), lineHeight: rf(22), fontFamily: 'Inter-Regular', fontWeight: '400', color: textColor },
  subhead: { fontSize: rf(16), lineHeight: rf(22), fontFamily: 'Inter-SemiBold', fontWeight: '600', color: textColor },
  caption: { fontSize: rf(14), lineHeight: rf(20), fontFamily: 'Inter-Medium', fontWeight: '500', color: textColor },
  button: { fontSize: rf(16), lineHeight: rf(20), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  buttonSmall: { fontSize: rf(14), lineHeight: rf(18), fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
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

const baseShadows = buildShadows(6, 10);
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
  const [windowSize, setWindowSize] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWindowSize(window));
    return () => sub?.remove?.();
  }, []);

  const width = windowSize.width;
  const height = windowSize.height;
  const isSmallScreen = width <= 380;
  const density: Density = isSmallScreen ? 'compact' : width >= 900 ? 'spacious' : 'regular';

  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const primary = mode === 'dark' ? primaryRampDark : primaryRampLight;
  const statusSoft = mode === 'dark' ? statusSoftDark : statusSoftLight;

  const spacing = useMemo(buildSpacing, [width]);
  const radius = useMemo(buildRadius, [width]);
  const typography = useMemo(() => buildTypography(palette.text), [palette.text, width]);
  const scaledIcons = useMemo(buildIconSizes, [width]);
  const shadows = useMemo(() => {
    return {
      card: { ...baseShadows.card, ...buildShadow(baseShadows.card.elevation ?? 6, 0.08) },
      raised: { ...baseShadows.raised, ...buildShadow(baseShadows.raised.elevation ?? 10, 0.14) },
    };
  }, []);

  const tapMinHeight = Math.max(44, hp('5%'));
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
      device: { width, density, isSmallScreen, isTablet: width >= 768 },
      statusBarStyle: mode === 'dark' ? 'light' : 'dark',
      statusBarBackground: palette.background,
      setMode,
    }),
    [density, height, insets, isSmallScreen, mode, palette, radius, scaledIcons, shadows, spacing, tapHitSlop, tapMinHeight, typography, width, primary, statusSoft]
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
