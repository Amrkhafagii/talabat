export const iosColors = {
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
  sm: 12,
  md: 16,
  lg: 20,
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
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    shadowColor: iosColors.shadow,
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

export const iosTypography: Record<string, TextStyle> = {
  title1: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: iosColors.text },
  title2: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: iosColors.text },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: iosColors.text },
  body: { fontSize: 16, lineHeight: 21, fontWeight: '400', color: iosColors.text },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: iosColors.secondaryText },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', color: iosColors.tertiaryText },
  button: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: iosColors.text },
};

export const iosComponentPresets: {
  pillBase: ViewStyle;
  pillActive: ViewStyle;
  ctaPrimary: ViewStyle;
} = {
  pillBase: {
    height: 36,
    paddingHorizontal: iosSpacing.md,
    borderRadius: iosRadius.pill,
    backgroundColor: iosColors.chipBg,
    borderWidth: 0,
  },
  pillActive: {
    height: 36,
    paddingHorizontal: iosSpacing.md,
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
