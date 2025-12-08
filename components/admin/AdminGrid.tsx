import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { iosSpacing } from '@/styles/iosTheme';
import { wp } from '@/styles/responsive';

type AdminGridProps = {
  minColumnWidth?: number;
  gap?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Responsive grid: percent-based columns with flexible growth.
export function AdminGrid({ minColumnWidth = 320, gap = iosSpacing.sm, children, style }: AdminGridProps) {
  const horizontalPadding = Math.max(iosSpacing.md, wp('5%'));
  const effectiveMin = Math.max(minColumnWidth, wp('44%'));
  const maxWidth = wp('92%');
  const childArray = React.Children.toArray(children);

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap, paddingHorizontal: horizontalPadding }, style]}>
      {childArray.map((child, idx) => (
        <View
          key={idx}
          style={{
            flexBasis: wp('48%'),
            flexGrow: 1,
            minWidth: effectiveMin,
            maxWidth,
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
