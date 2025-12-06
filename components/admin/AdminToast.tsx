import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  message: string | null;
  tone?: 'info' | 'success' | 'warning' | 'error';
};

export function AdminToast({ message, tone = 'info' }: Props) {
  if (!message) return null;
  const toneStyle = {
    info: styles.info,
    success: styles.success,
    warning: styles.warning,
    error: styles.error,
  }[tone];

  return (
    <View style={[styles.toast, toneStyle]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  text: { color: '#0F172A', fontWeight: '600' },
  info: { backgroundColor: '#E0F2FE' },
  success: { backgroundColor: '#DCFCE7' },
  warning: { backgroundColor: '#FEF3C7' },
  error: { backgroundColor: '#FEE2E2' },
});
