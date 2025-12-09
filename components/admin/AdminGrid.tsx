import React, { useMemo } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { iosSpacing } from '@/styles/iosTheme';
import { useResponsiveDevice, wp } from '@/styles/responsive';

type AdminGridProps = {
  minColumnWidth?: number;
  gap?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Responsive grid: percent-based columns with flexible growth.
export function AdminGrid({ minColumnWidth = 320, gap = iosSpacing.sm, children, style }: AdminGridProps) {
  const device = useResponsiveDevice();
  const { horizontalPadding, columnBasis, effectiveMin, maxWidth } = useMemo(() => {
    const horizontalPadding = Math.max(iosSpacing.md, wp(device.isTablet ? '4%' : '5%'));
    const columnBasis = wp(device.isTablet ? '31%' : '48%');
    const effectiveMin = Math.max(minColumnWidth, wp(device.isTablet ? '30%' : '44%'));
    const maxWidth = wp(device.isTablet ? '34%' : '92%');
    return { horizontalPadding, columnBasis, effectiveMin, maxWidth };
  }, [device.isTablet, minColumnWidth]);
  const childArray = React.Children.toArray(children);

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap, paddingHorizontal: horizontalPadding }, style]}>
      {childArray.map((child, idx) => (
        <View
          key={idx}
          style={{
            flexBasis: columnBasis,
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
