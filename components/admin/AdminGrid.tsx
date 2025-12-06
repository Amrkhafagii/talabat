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
  const horizontalPadding = width < 720 ? iosSpacing.md : iosSpacing.lg;
  const columns = Math.max(1, Math.floor((width - horizontalPadding * 2) / minColumnWidth));
  const gapSize = gap;
  const columnWidth = Math.max(minColumnWidth, (width - horizontalPadding * 2 - gapSize * (columns - 1)) / columns);
  const childArray = React.Children.toArray(children);

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap, paddingHorizontal: 0 }, style]}>
      {childArray.map((child, idx) => (
        <View
          key={idx}
          style={{
            flexBasis: columnWidth,
            flexGrow: 1,
            minWidth: minColumnWidth,
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
