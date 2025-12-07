import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, ViewStyle, StyleSheet } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export type SegmentOption = { key: string; label: string };

type SegmentedControlProps = {
  options: SegmentOption[];
  value: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
};

export default function SegmentedControl({ options, value, onChange, style }: SegmentedControlProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt.key)}
            hitSlop={theme.tap.hitSlop}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surfaceAlt,
      padding: theme.spacing.xxs,
    },
    segment: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      alignItems: 'center',
    } as ViewStyle,
    segmentActive: {
      backgroundColor: theme.colors.surface,
      ...theme.shadows.card,
    },
    segmentLabel: { ...theme.typography.subhead, color: theme.colors.secondaryText },
    segmentLabelActive: { color: theme.colors.text, fontFamily: 'Inter-SemiBold' },
  });
}
