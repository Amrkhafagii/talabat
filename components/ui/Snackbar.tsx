import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type SnackbarProps = {
  visible: boolean;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
  style?: ViewStyle;
};

export default function Snackbar({ visible, message, type = 'info', onClose, style }: SnackbarProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const colors = {
    info: theme.colors.status.info,
    success: theme.colors.status.success,
    warning: theme.colors.status.warning,
    error: theme.colors.status.error,
  };
  const tone = colors[type];

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, style, { borderColor: tone, backgroundColor: `${tone}1A` }]}>
      <Text style={[styles.message, { color: theme.colors.text }]}>{message}</Text>
      {onClose ? (
        <TouchableOpacity onPress={onClose} hitSlop={theme.tap.hitSlop}>
          <X size={18} color={theme.colors.secondaryText} />
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return {
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      ...theme.shadows.card,
    } as ViewStyle,
    message: { ...theme.typography.body },
  };
}
