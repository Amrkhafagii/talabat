import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
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
  const { width: screenWidth } = useWindowDimensions();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const layout = useMemo(
    () => computeLayout(data?.length ?? 0, screenWidth, theme.spacing.sm),
    [data?.length, screenWidth, theme.spacing.sm]
  );

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContainer, { minWidth: layout.chartWidth }]}
    >
      <View style={[styles.chart, { gap: layout.gap }]}>
        {data.map((d) => {
          const heightPct = (d.value / max) * 100;
          const id = d.key ?? d.label;
          const isActive = selectedKey ? selectedKey === id : d.active;
          return (
            <View
              key={id}
              style={[styles.barWrapper, { minWidth: layout.barSlot, maxWidth: layout.barSlot }]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: Boolean(isActive) }}
                accessibilityLabel={`${d.label}, ${d.value}`}
                onPress={() => onSelect?.({ ...d, key: id })}
                activeOpacity={0.8}
                hitSlop={theme.tap.hitSlop}
                style={styles.barTouch}
              >
                <View
                  style={[
                    styles.bar,
                    { height: `${heightPct}%`, width: layout.barWidth },
                    isActive && styles.barActive,
                  ]}
                />
              </TouchableOpacity>
              <Text style={[styles.label, isActive && styles.labelActive]}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

type ChartLayout = {
  barWidth: number;
  barSlot: number;
  chartWidth: number;
  gap: number;
};

const computeLayout = (count: number, screenWidth: number, gap: number): ChartLayout => {
  const minimumBars = Math.max(count, 4);
  const safeWidth = Math.max(screenWidth - gap * 4, 240);
  const idealBar = safeWidth / (minimumBars * 1.6);
  const barWidth = Math.min(Math.max(idealBar, 16), 28);
  const barSlot = barWidth + gap;
  const chartWidth = Math.max(safeWidth, count * barSlot + gap * 2);

  return { barWidth, barSlot, chartWidth, gap };
};

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContainer: {
      paddingHorizontal: theme.spacing.sm,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    barWrapper: { alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 },
    barTouch: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', minHeight: 80 },
    bar: {
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
