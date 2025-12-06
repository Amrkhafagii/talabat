import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { iosColors, iosSpacing, iosTypography, iosShadow } from '@/styles/iosTheme';

type TabItem = {
  key: string;
  label: string;
  icon?: React.ReactNode | ((active: boolean) => React.ReactNode);
  onPress: () => void;
};

type IOSBottomTabBarProps = {
  items: TabItem[];
  activeKey: string;
  style?: StyleProp<ViewStyle>;
};

export function IOSBottomTabBar({ items, activeKey, style }: IOSBottomTabBarProps) {
  return (
    <View style={[styles.container, style]}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.tab}
            onPress={item.onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            {item.icon ? (
              <View style={[styles.icon, active && styles.iconActive]}>
                {typeof item.icon === 'function' ? item.icon(active) : item.icon}
              </View>
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type Styles = {
  container: ViewStyle;
  tab: ViewStyle;
  icon: ViewStyle;
  iconActive: ViewStyle;
  label: TextStyle;
  labelActive: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: iosSpacing.md,
    paddingVertical: iosSpacing.xs,
    backgroundColor: iosColors.surface,
    borderTopWidth: 0.5,
    borderTopColor: iosColors.separator,
    ...iosShadow.header,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: iosSpacing.xs },
  icon: { marginBottom: 2, opacity: 0.6 },
  iconActive: { opacity: 1 },
  label: { ...iosTypography.caption, color: iosColors.secondaryText },
  labelActive: { color: iosColors.primary, fontWeight: '600' },
});

export default IOSBottomTabBar;
