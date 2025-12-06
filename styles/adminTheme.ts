export const adminColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#E2E8F0',
  text: '#0F172A',
  subtext: '#475569',
  muted: '#94A3B8',
  primary: '#0F172A',
  accent: '#111827',
  info: '#2563EB',
  infoBg: '#EFF6FF',
  warningBg: '#FFF4E5',
  warningText: '#B45309',
  successBg: '#ECFDF3',
  successText: '#15803D',
  errorBg: '#FEF2F2',
  errorText: '#B91C1C',
  badgeNeutralBg: '#E5E7EB',
  badgeNeutralText: '#1F2937',
  badgeInfoBg: '#DBEAFE',
  badgeInfoText: '#1D4ED8',
  badgeWarnBg: '#FEF3C7',
  badgeWarnText: '#92400E',
  badgeErrorBg: '#FEE2E2',
  badgeErrorText: '#991B1B',
  overlay: 'rgba(15, 23, 42, 0.08)',
  shadow: '#0F172A',
};

export const adminSpace = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};

export const adminRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
};

export const adminElevation = {
  none: { shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  sm: { shadowColor: adminColors.shadow, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  md: { shadowColor: adminColors.shadow, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  lg: { shadowColor: adminColors.shadow, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
};

export const adminTypography = {
  header: { fontSize: 18, lineHeight: 24, fontFamily: 'Inter-SemiBold', color: adminColors.text },
  subheader: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter-Regular', color: adminColors.subtext },
  body: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter-Regular', color: adminColors.text },
  meta: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter-Regular', color: adminColors.subtext },
  button: { fontFamily: 'Inter-SemiBold', color: '#FFFFFF', fontSize: 13 },
  caption: { fontSize: 11, lineHeight: 14, fontFamily: 'Inter-Medium', color: adminColors.muted },
  data: { fontSize: 16, lineHeight: 22, fontFamily: 'Inter-SemiBold', color: adminColors.text },
};
