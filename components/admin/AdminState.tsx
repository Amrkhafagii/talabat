import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { useAppTheme } from '@/styles/appTheme';

type StateProps = {
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
  children?: React.ReactNode;
  useIos?: boolean;
};

export function AdminState({ loading, error, emptyMessage, actionLabel, onAction, hint, children, useIos = false }: StateProps) {
  const appTheme = useAppTheme();
  const themedStyles = useMemo(() => createStyles(appTheme), [appTheme]);
  const theme = useIos ? iosStyles : themedStyles;
  if (loading) {
    return (
      <View style={theme.center}>
        <ActivityIndicator size="large" color={appTheme.colors.primary[500]} />
        <Text style={theme.helper}>Loading…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={theme.center}>
        <Text style={[theme.helper, theme.error]}>Error: {error}</Text>
        {hint && <Text style={theme.helper}>{hint}</Text>}
        {onAction && (
          <TouchableOpacity style={theme.cta} onPress={onAction} accessibilityRole="button">
            <Text style={theme.ctaText}>{actionLabel || 'Retry'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  if (!children) {
    return (
      <View style={theme.center}>
        <Text style={theme.helper}>{emptyMessage || 'No data.'}</Text>
        {hint && <Text style={theme.helper}>{hint}</Text>}
        {onAction && (
          <TouchableOpacity style={theme.cta} onPress={onAction} accessibilityRole="button">
            <Text style={theme.ctaText}>{actionLabel || 'Refresh'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  return <>{children}</>;
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    center: { alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md },
    helper: { color: theme.colors.textMuted, marginTop: theme.spacing.xs, textAlign: 'center' },
    error: { color: theme.colors.status.error },
    cta: {
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primary[500],
      borderRadius: theme.radius.md,
    },
    ctaText: { color: theme.colors.textInverse, fontWeight: '700' },
  });

const iosStyles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: iosSpacing.md, backgroundColor: 'transparent' },
  helper: { ...iosTypography.caption, marginTop: iosSpacing.xs, textAlign: 'center' },
  error: { color: iosColors.destructive },
  cta: {
    marginTop: iosSpacing.xs,
    paddingHorizontal: iosSpacing.md,
    paddingVertical: iosSpacing.xs,
    backgroundColor: iosColors.primary,
    borderRadius: iosRadius.pill,
    minHeight: 36,
    justifyContent: 'center',
  },
  ctaText: { ...iosTypography.button, color: '#FFFFFF' },
});
