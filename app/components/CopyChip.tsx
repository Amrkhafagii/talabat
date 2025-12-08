import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '@/styles/appTheme';

type Props = { label: string; value?: string | null };

export default function CopyChip({ label, value }: Props) {
  if (!value) return null;
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const copy = () => {
    Clipboard.setStringAsync(String(value));
  };
  return (
    <TouchableOpacity style={styles.chip} onPress={copy}>
      <Text style={styles.chipText}>{label}: {value.slice(0, 12)}…</Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    chip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing.xxs,
    },
    chipText: {
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      fontSize: 12,
    },
  });
