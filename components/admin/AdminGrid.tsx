import React from 'react';
import { View, useWindowDimensions, StyleProp, ViewStyle } from 'react-native';
import { iosSpacing } from '@/styles/iosTheme';

type AdminGridProps = {
  minColumnWidth?: number;
  gap?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Simple responsive grid: chooses column count based on available width.
export function AdminGrid({ minColumnWidth = 320, gap = iosSpacing.sm, children, style }: AdminGridProps) {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 400 ? iosSpacing.sm : width < 720 ? iosSpacing.md : iosSpacing.lg;
  const availableWidth = Math.max(0, width - horizontalPadding * 2);
  const effectiveMin = Math.min(minColumnWidth, Math.max(260, availableWidth));
  const columns = Math.max(1, Math.floor((availableWidth + gap) / (effectiveMin + gap)));
  const columnWidth = columns === 1
    ? availableWidth
    : Math.max(effectiveMin, (availableWidth - gap * (columns - 1)) / columns);
  const childArray = React.Children.toArray(children);

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap, paddingHorizontal: horizontalPadding }, style]}>
      {childArray.map((child, idx) => (
        <View
          key={idx}
          style={{
            flexBasis: columnWidth,
            flexGrow: 1,
            minWidth: Math.min(effectiveMin, columnWidth),
            gap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

export default AdminGrid;
