import React, { useMemo } from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type FABProps = {
  icon: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  backgroundColor?: string;
};

export default function FAB({ icon, onPress, style, backgroundColor }: FABProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.fab, backgroundColor ? { backgroundColor } : null, style]}
      activeOpacity={0.8}
      hitSlop={theme.tap.hitSlop}
    >
      {icon}
    </TouchableOpacity>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return {
    fab: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.raised,
    } as ViewStyle,
  };
}
