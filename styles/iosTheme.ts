export const iosColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F8F9FB',
  surfaceMuted: '#F7F8FC',
  separator: '#E5E5EA',
  cardShadow: 'rgba(0, 0, 0, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.12)',
  text: '#0A0A0A',
  secondaryText: '#3C3C43',
  tertiaryText: '#8E8E93',
  chipBg: '#E5E5EA',
  chipText: '#3C3C43',
  chipActiveBg: '#DDEBFF',
  chipActiveText: '#0A84FF',
  border: '#D1D1D6',
  disabled: '#C7C7CC',
  placeholder: '#C7C7CC',
  primary: '#007AFF',
  primaryAlt: '#0A84FF',
  destructive: '#FF3B30',
  success: '#34C759',
  successAlt: '#1EBE5D',
  warning: '#FF9500',
  warningAlt: '#FF9F0A',
  info: '#5AC8FA',
  infoAlt: '#5AC8FA',
};

export const iosSpacing = {
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

export const iosRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xl2: 28,
  bar: 12,
  pill: 999,
  pillSm: 999,
};

export const iosShadow = {
  card: {
    shadowColor: iosColors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  header: {
    shadowColor: iosColors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  overlay: {
    shadowColor: 'rgba(0, 0, 0, 0.18)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  button: {
    shadowColor: 'rgba(0, 0, 0, 0.12)',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};

export const iosTypography: Record<string, TextStyle> = {
  title1: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: iosColors.text },
  title2: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: iosColors.text },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: iosColors.text },
  body: { fontSize: 16, lineHeight: 21, fontWeight: '400', color: iosColors.text },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '500', color: iosColors.secondaryText },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', color: iosColors.tertiaryText },
  button: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: iosColors.text },
};

export const iosComponentPresets: {
  pillBase: ViewStyle;
  pillActive: ViewStyle;
  ctaPrimary: ViewStyle;
} = {
  pillBase: {
    height: 36,
    paddingHorizontal: iosSpacing.md - 2,
    borderRadius: iosRadius.pill,
    backgroundColor: iosColors.chipBg,
    borderWidth: 0,
  },
  pillActive: {
    height: 36,
    paddingHorizontal: iosSpacing.md - 2,
    borderRadius: iosRadius.pill,
    backgroundColor: iosColors.chipActiveBg,
    borderWidth: 1,
    borderColor: iosColors.primary,
  },
  ctaPrimary: {
    height: 44,
    paddingHorizontal: iosSpacing.lg,
    borderRadius: iosRadius.md,
    backgroundColor: iosColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

import type { TextStyle, ViewStyle } from 'react-native';
