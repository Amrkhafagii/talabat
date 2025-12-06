import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

type StateProps = {
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
  children?: React.ReactNode;
};

export function AdminState({ loading, error, emptyMessage, actionLabel, onAction, hint, children }: StateProps) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.helper}>Loading…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.helper, styles.error]}>Error: {error}</Text>
        {hint && <Text style={styles.helper}>{hint}</Text>}
        {onAction && (
          <TouchableOpacity style={styles.cta} onPress={onAction} accessibilityRole="button">
            <Text style={styles.ctaText}>{actionLabel || 'Retry'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  if (!children) {
    return (
      <View style={styles.center}>
        <Text style={styles.helper}>{emptyMessage || 'No data.'}</Text>
        {hint && <Text style={styles.helper}>{hint}</Text>}
        {onAction && (
          <TouchableOpacity style={styles.cta} onPress={onAction} accessibilityRole="button">
            <Text style={styles.ctaText}>{actionLabel || 'Refresh'}</Text>
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
