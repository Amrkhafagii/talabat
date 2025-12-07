import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type BlockProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

type ListProps = {
  rows?: number;
  gap?: number;
  inset?: number;
  lineHeight?: number;
};

export function BlockSkeleton({ width = '100%', height = 14, radius, style }: BlockProps) {
  const theme = useRestaurantTheme();
  return (
    <View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.md,
          backgroundColor: theme.colors.surfaceAlt,
          opacity: 0.75,
        },
        style,
      ]}
    />
  );
}

export function ListSkeleton({ rows = 3, gap = 12, inset, lineHeight = 14 }: ListProps) {
  const theme = useRestaurantTheme();
  const horizontal = inset ?? theme.spacing.lg;
  return (
    <View style={{ paddingHorizontal: horizontal, paddingVertical: theme.spacing.md, gap }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.card,
            {
              borderRadius: theme.radius.xl,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              ...theme.shadows.card,
              shadowOpacity: theme.shadows.card?.shadowOpacity ?? 0.08,
              marginTop: idx === 0 ? 0 : gap,
            },
          ]}
        >
          <BlockSkeleton width="52%" height={18} radius={theme.radius.sm} />
          <BlockSkeleton width="34%" height={lineHeight} radius={theme.radius.sm} />
          <BlockSkeleton width="78%" height={lineHeight} radius={theme.radius.sm} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <BlockSkeleton width="42%" height={lineHeight} radius={theme.radius.sm} />
            <BlockSkeleton width="24%" height={lineHeight} radius={theme.radius.sm} />
          </View>
          <BlockSkeleton width="100%" height={Math.max(theme.tap.minHeight, 46)} radius={theme.radius.pill} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: '#EDEDED' },
  card: { padding: 16, borderWidth: 1, gap: 10 },
});

export default ListSkeleton;
