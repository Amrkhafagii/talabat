import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export type BarDatum = { label: string; value: number; key?: string; active?: boolean };

type BarChartProps = {
  data: BarDatum[];
  loading?: boolean;
  emptyLabel?: string;
  selectedKey?: string;
  onSelect?: (bar: BarDatum) => void;
};

export default function BarChart({ data, loading, emptyLabel = 'No data yet', selectedKey, onSelect }: BarChartProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.empty}>{'Loading...'}</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>{emptyLabel}</Text>
      </View>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.chart}>
      {data.map((d) => {
        const heightPct = (d.value / max) * 100;
        const id = d.key ?? d.label;
        const isActive = selectedKey ? selectedKey === id : d.active;
        return (
          <View key={id} style={styles.barWrapper}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: Boolean(isActive) }}
              accessibilityLabel={`${d.label}, ${d.value}`}
              onPress={() => onSelect?.({ ...d, key: id })}
              activeOpacity={0.8}
              hitSlop={theme.tap.hitSlop}
              style={styles.barTouch}
            >
              <View style={[styles.bar, { height: `${heightPct}%` }, isActive && styles.barActive]} />
            </TouchableOpacity>
            <Text style={[styles.label, isActive && styles.labelActive]}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    barWrapper: { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
    barTouch: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', minHeight: 80 },
    bar: {
      width: 20,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.borderMuted,
    },
    barActive: {
      backgroundColor: theme.colors.accent,
    },
    label: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: theme.spacing.xs },
    labelActive: { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
    empty: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: theme.spacing.xs },
  });
}
