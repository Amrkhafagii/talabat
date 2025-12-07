import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Source-of-truth tokens for the new delivery UI (light + dark earnings variant).
 * These values are pulled directly from the provided mocks and should replace
 * ad-hoc color/spacing usage in delivery screens.
 */

type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceStrong?: string;
  secondaryText?: string;
  mutedText?: string;
  border: string;
  borderMuted?: string;
  formSurface?: string;
  formSurfaceAlt?: string;
  formBorder?: string;
  formPlaceholder?: string;
  formText?: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  success: string;
  warning: string;
  error: string;
  positive: string;
  pill: string;
  overlay?: string;
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

export type DeliveryTokens = {
  palette: Palette;
  spacing: Spacing;
  radius: Radius;
  shadows: ShadowSet;
  typography: Typography;
};

const baseSpacing: Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xl2: 32,
};

const baseRadius: Radius = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
  card: 18,
  cta: 20,
};

const lightPalette: Palette = {
  background: '#F8F6F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F1ED',
  border: '#E5E1DA',
  secondaryText: '#6B7280',
  mutedText: '#8A8F99',
  formSurface: '#FFFFFF',
  formSurfaceAlt: '#F4F1ED',
  formBorder: '#E5E1DA',
  formPlaceholder: '#8A8F99',
  formText: '#1B1B1B',
  text: '#1B1B1B',
  textMuted: '#6B7280',
  textSubtle: '#8A8F99',
  accent: '#FF6B35',
  accentStrong: '#FF7E3F',
  accentSoft: '#FFE8DB',
  success: '#1FB360',
  warning: '#F59E0B',
  error: '#D92D20',
  positive: '#16A34A',
  pill: '#F0F1F5',
  surfaceStrong: '#FFFFFF',
  borderMuted: '#E9E4DC',
};

const darkPalette: Palette = {
  background: '#0F1524',
  surface: '#121A2C',
  surfaceAlt: '#0D1322',
  surfaceStrong: '#0D1322',
  secondaryText: '#9FB3D9',
  mutedText: '#7E8FB3',
  formSurface: '#121A2C',
  formSurfaceAlt: '#182742',
  formBorder: '#1F2A44',
  formPlaceholder: '#7E8FB3',
  formText: '#FFFFFF',
  border: '#1F2A44',
  borderMuted: '#25324D',
  text: '#FFFFFF',
  textMuted: '#9FB3D9',
  textSubtle: '#7E8FB3',
  accent: '#1F3B73',
  accentStrong: '#1E3A8A',
  accentSoft: '#182742',
  success: '#22C55E',
  warning: '#FBBF24',
  error: '#F87171',
  positive: '#22C55E',
  pill: '#1C2740',
  overlay: 'rgba(0,0,0,0.45)',
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
  title1: { fontSize: 24, lineHeight: 30, fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  title2: { fontSize: 20, lineHeight: 26, fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  titleXl: { fontSize: 28, lineHeight: 34, fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  titleL: { fontSize: 24, lineHeight: 30, fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  titleM: { fontSize: 20, lineHeight: 26, fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  body: { fontSize: 16, lineHeight: 22, fontFamily: 'Inter-Regular', fontWeight: '400', color: textColor },
  subhead: { fontSize: 15, lineHeight: 22, fontFamily: 'Inter-SemiBold', fontWeight: '600', color: textColor },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter-Medium', fontWeight: '500', color: textColor },
  button: { fontSize: 16, lineHeight: 20, fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
  buttonSmall: { fontSize: 14, lineHeight: 18, fontFamily: 'Inter-Bold', fontWeight: '700', color: textColor },
});

export const deliveryTokensLight: DeliveryTokens = {
  palette: lightPalette,
  spacing: baseSpacing,
  radius: baseRadius,
  shadows: buildShadows(6, 10),
  typography: buildTypography(lightPalette.text),
};

export const deliveryTokensDark: DeliveryTokens = {
  palette: darkPalette,
  spacing: baseSpacing,
  radius: baseRadius,
  shadows: buildShadows(6, 10),
  typography: buildTypography(darkPalette.text),
};
