import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';

type Props = { label: string; value?: string | null };

export default function CopyChip({ label, value }: Props) {
  if (!value) return null;
  const copy = () => {
    Clipboard.setStringAsync(String(value));
  };
  return (
    <TouchableOpacity style={styles.chip} onPress={copy}>
      <Text style={styles.chipText}>{label}: {value.slice(0, 12)}…</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 6,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    fontSize: 12,
  },
});
