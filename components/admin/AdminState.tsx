import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';

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
  const theme = useIos ? iosStyles : styles;
  if (loading) {
    return (
      <View style={theme.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
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

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  helper: { color: '#4B5563', marginTop: 8, textAlign: 'center' },
  error: { color: '#B91C1C' },
  cta: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0F172A', borderRadius: 8 },
  ctaText: { color: '#FFFFFF', fontWeight: '700' },
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
