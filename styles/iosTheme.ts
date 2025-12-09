import type { TextStyle, ViewStyle } from 'react-native';
import type { AppTheme } from './appTheme';

const legacyColors = {
  background: '#F3F3F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F8FC',
  surfaceMuted: '#F5F6FA',
  separator: '#E2E3E8',
  cardShadow: 'rgba(0, 0, 0, 0.06)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  text: '#0A0A0A',
  secondaryText: '#3C3C43',
  tertiaryText: '#8E8E93',
  chipBg: '#E6E7EC',
  chipText: '#3C3C43',
  chipActiveBg: '#DDEAFF',
  chipActiveText: '#0A84FF',
  border: '#D1D1D8',
  disabled: '#C7C7CC',
  placeholder: '#B8B9BF',
  textInverse: '#FFFFFF',
  primary: '#0A84FF',
  primaryAlt: '#007AFF',
  destructive: '#FF3B30',
  success: '#34C759',
  successAlt: '#1EBE5D',
  warning: '#FF9500',
  warningAlt: '#FF9F0A',
  info: '#5AC8FA',
  infoAlt: '#5AC8FA',
};

const legacySpacing = {
  xxxs: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xl2: 32,
  '2xl': 32,
};

const legacyRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xl2: 28,
  bar: 12,
  pill: 999,
  pillSm: 999,
};

const legacyShadow = {
  card: {
    shadowColor: legacyColors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    shadowColor: legacyColors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  overlay: {
    shadowColor: 'rgba(0, 0, 0, 0.18)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  button: {
    shadowColor: 'rgba(0, 0, 0, 0.12)',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
};

const legacyTypography: Record<string, TextStyle> = {
  title1: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: legacyColors.text },
  title2: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: legacyColors.text },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: legacyColors.text },
  body: { fontSize: 16, lineHeight: 21, fontWeight: '400', color: legacyColors.text },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: legacyColors.secondaryText },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: legacyColors.tertiaryText },
  button: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: legacyColors.text },
};

export type IosColors = typeof legacyColors;
export type IosSpacing = typeof legacySpacing;
export type IosRadius = typeof legacyRadius;
export type IosShadow = typeof legacyShadow;
export type IosTypography = typeof legacyTypography;

let iosColors: IosColors = legacyColors;
let iosSpacing: IosSpacing = legacySpacing;
let iosRadius: IosRadius = legacyRadius;
let iosShadow: IosShadow = legacyShadow;
let iosTypography: IosTypography = legacyTypography;

export let iosComponentPresets: {
  pillBase: ViewStyle;
  pillActive: ViewStyle;
  ctaPrimary: ViewStyle;
} = buildComponentPresets(iosColors, iosSpacing, iosRadius);

export { iosColors, iosSpacing, iosRadius, iosShadow, iosTypography };

function ensureStringColor(value: ViewStyle['shadowColor'], fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function ensureNumber(value: ViewStyle['shadowRadius'] | undefined, fallback: number) {
  return typeof value === 'number' ? value : fallback;
}

function ensureNumericOpacity(value: ViewStyle['shadowOpacity'] | undefined, fallback: number) {
  return typeof value === 'number' ? value : fallback;
}

function ensureOffset(value: ViewStyle['shadowOffset'] | undefined, fallback: { width: number; height: number }) {
  if (value && typeof value.width === 'number' && typeof value.height === 'number') {
    return value;
  }
  return fallback;
}

function mapAppThemeToIosTokens(theme: AppTheme) {
  const colors: IosColors = {
    background: theme.colors.background,
    surface: theme.colors.surface,
    surfaceAlt: theme.colors.surfaceAlt,
    surfaceMuted: theme.colors.surfaceAlt,
    separator: theme.colors.border,
    cardShadow: ensureStringColor(theme.shadows.card.shadowColor, 'rgba(0, 0, 0, 0.06)'),
    shadow: ensureStringColor(theme.shadows.raised.shadowColor, 'rgba(0, 0, 0, 0.1)'),
    text: theme.colors.text,
    secondaryText: theme.colors.secondaryText,
    tertiaryText: theme.colors.textSubtle,
    chipBg: theme.colors.pill || theme.colors.surfaceAlt,
    chipText: theme.colors.secondaryText,
    chipActiveBg: theme.colors.accentSoft || theme.colors.primary[100],
    chipActiveText: theme.colors.primary[500],
    border: theme.colors.border,
    disabled: theme.colors.borderMuted,
    placeholder: theme.colors.formPlaceholder,
    textInverse: theme.colors.textInverse || '#FFFFFF',
    primary: theme.colors.primary[500],
    primaryAlt: theme.colors.primary[600] || theme.colors.accentStrong,
    destructive: theme.colors.error,
    success: theme.colors.success,
    successAlt: theme.colors.status.success || theme.colors.success,
    warning: theme.colors.warning,
    warningAlt: theme.colors.status.warning || theme.colors.warning,
    info: theme.colors.info,
    infoAlt: theme.colors.status.info || theme.colors.info,
  };

  const spacing: IosSpacing = {
    xxxs: Math.max(2, Math.round(theme.spacing.xxs / 2)),
    xxs: theme.spacing.xxs,
    xs: theme.spacing.xs,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
    xl: theme.spacing.xl,
    xl2: theme.spacing.xl2,
    '2xl': theme.spacing.xl2,
  };

  const radius: IosRadius = {
    sm: theme.radius.sm,
    md: Math.max(theme.radius.md, theme.radius.sm + 4),
    lg: Math.max(theme.radius.lg, theme.radius.md + 4),
    xl: Math.max(theme.radius.xl, theme.radius.lg + 4),
    xl2: Math.max(theme.radius.card + 10, theme.radius.xl + 6),
    bar: Math.max(theme.radius.md, 12),
    pill: theme.radius.pill,
    pillSm: theme.radius.pill,
  };

  const shadow: IosShadow = {
    card: {
      ...theme.shadows.card,
      shadowColor: ensureStringColor(theme.shadows.card.shadowColor, colors.cardShadow),
      shadowOpacity: ensureNumericOpacity(theme.shadows.card.shadowOpacity, 1),
      shadowRadius: ensureNumber(theme.shadows.card.shadowRadius, 10),
      shadowOffset: ensureOffset(theme.shadows.card.shadowOffset, { width: 0, height: 4 }),
      elevation: ensureNumber(theme.shadows.card.elevation, 2),
    },
    header: {
      ...theme.shadows.card,
      shadowColor: ensureStringColor(theme.shadows.card.shadowColor, colors.shadow),
      shadowOpacity: ensureNumericOpacity(theme.shadows.card.shadowOpacity, 0.08),
      shadowRadius: ensureNumber(theme.shadows.card.shadowRadius, 6),
      shadowOffset: ensureOffset(theme.shadows.card.shadowOffset, { width: 0, height: 3 }),
      elevation: ensureNumber(theme.shadows.card.elevation, 1),
    },
    overlay: {
      ...theme.shadows.raised,
      shadowColor: ensureStringColor(theme.shadows.raised.shadowColor, 'rgba(0, 0, 0, 0.18)'),
      shadowOpacity: ensureNumericOpacity(theme.shadows.raised.shadowOpacity, 1),
      shadowRadius: ensureNumber(theme.shadows.raised.shadowRadius, 14),
      shadowOffset: ensureOffset(theme.shadows.raised.shadowOffset, { width: 0, height: 8 }),
      elevation: ensureNumber(theme.shadows.raised.elevation, 6),
    },
    button: {
      ...theme.shadows.card,
      shadowColor: ensureStringColor(theme.shadows.card.shadowColor, 'rgba(0, 0, 0, 0.12)'),
      shadowOpacity: ensureNumericOpacity(theme.shadows.card.shadowOpacity, 1),
      shadowRadius: ensureNumber(theme.shadows.card.shadowRadius, 8),
      shadowOffset: ensureOffset(theme.shadows.card.shadowOffset, { width: 0, height: 5 }),
      elevation: ensureNumber(theme.shadows.card.elevation, 4),
    },
  };

  const typography: IosTypography = {
    title1: { ...(theme.typography.title1 || theme.typography.titleL), color: colors.text },
    title2: { ...(theme.typography.title2 || theme.typography.titleM), color: colors.text },
    headline: { ...(theme.typography.subhead || theme.typography.body), color: colors.text },
    body: { ...theme.typography.body, color: colors.text },
    subhead: { ...theme.typography.subhead, color: colors.secondaryText },
    caption: { ...theme.typography.caption, color: colors.tertiaryText },
    button: { ...theme.typography.button, color: colors.text },
  };

  return {
    colors,
    spacing,
    radius,
    shadow,
    typography,
    presets: buildComponentPresets(colors, spacing, radius),
  };
}

function buildComponentPresets(colors: IosColors, spacing: IosSpacing, radius: IosRadius) {
  const presets: { pillBase: ViewStyle; pillActive: ViewStyle; ctaPrimary: ViewStyle } = {
    pillBase: {
      height: 36,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.chipBg,
      borderWidth: 0,
    },
    pillActive: {
      height: 36,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.chipActiveBg,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    ctaPrimary: {
      height: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  };
  return presets;
}

/**
 * Sync the legacy iOS token surface with the active AppTheme so existing imports stay intact.
 */
export function syncIosTheme(appTheme: AppTheme) {
  const mapped = mapAppThemeToIosTokens(appTheme);
  iosColors = mapped.colors;
  iosSpacing = mapped.spacing;
  iosRadius = mapped.radius;
  iosShadow = mapped.shadow;
  iosTypography = mapped.typography;
  iosComponentPresets = mapped.presets;
}
