import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/styles/appTheme';

type Props = {
  message: string | null;
  tone?: 'info' | 'success' | 'warning' | 'error';
};

export function AdminToast({ message, tone = 'info' }: Props) {
  const theme = useAppTheme();
  const palette = useMemo(() => {
    const bg = theme.colors.statusSoft;
    const fg = theme.colors.status;
    return {
      info: { backgroundColor: bg.info, color: fg.info },
      success: { backgroundColor: bg.success, color: fg.success },
      warning: { backgroundColor: bg.warning, color: fg.warning },
      error: { backgroundColor: bg.error, color: fg.error },
    } as const;
  }, [theme.colors.status, theme.colors.statusSoft]);

  if (!message) return null;
  const toneStyle = palette[tone];

  return (
    <View style={[styles.toast, { backgroundColor: toneStyle.backgroundColor }]}>
      <Text style={[styles.text, { color: toneStyle.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  text: { fontWeight: '600' },
});
