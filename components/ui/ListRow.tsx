import React, { useMemo } from 'react';
import { TouchableOpacity, View, Text, ViewStyle, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type ListRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  rightAccessory?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
};

export default function ListRow({
  title,
  subtitle,
  value,
  onPress,
  leftIcon,
  rightAccessory,
  badge,
  disabled,
  style,
}: ListRowProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      disabled={!onPress || disabled}
      onPress={onPress}
      style={[styles.row, style, disabled && { opacity: 0.6 }]}
      activeOpacity={onPress ? 0.7 : 1}
      hitSlop={theme.tap.hitSlop}
    >
      <View style={styles.left}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.right}>
        {badge}
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {rightAccessory ?? (onPress ? <ChevronRight size={18} color={theme.colors.secondaryText} /> : null)}
      </View>
    </TouchableOpacity>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    row: {
      minHeight: theme.tap.minHeight,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
    },
    left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: theme.spacing.sm },
    right: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    icon: {
      width: 34,
      height: 34,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceAlt,
    },
    title: { ...theme.typography.subhead, color: theme.colors.text },
    subtitle: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: 2 },
    value: { ...theme.typography.subhead, color: theme.colors.secondaryText },
  });
}
