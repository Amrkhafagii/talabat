import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { ArrowLeft, CalendarDays } from 'lucide-react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actionIcon?: React.ReactNode;
  onActionPress?: () => void;
  dateLabel?: string;
  onDatePress?: () => void;
  style?: ViewStyle;
};

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  actionIcon,
  onActionPress,
  dateLabel,
  onDatePress,
  style,
}: ScreenHeaderProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconButton} hitSlop={theme.tap.hitSlop}>
            <ArrowLeft size={theme.iconSizes.md} strokeWidth={theme.icons.strokeWidth} color={theme.colors.text} />
          </TouchableOpacity>
        ) : null}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {dateLabel && onDatePress ? (
            <TouchableOpacity onPress={onDatePress} style={styles.dateRow} hitSlop={theme.tap.hitSlop}>
              <CalendarDays size={theme.iconSizes.sm} strokeWidth={theme.icons.strokeWidth} color={theme.colors.secondaryText} />
              <Text style={styles.dateLabel}>{dateLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {onActionPress ? (
        <TouchableOpacity onPress={onActionPress} style={styles.iconButton} hitSlop={theme.tap.hitSlop}>
          {actionIcon}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return {
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    title: { ...theme.typography.titleL, color: theme.colors.text },
    subtitle: { ...theme.typography.caption, color: theme.colors.secondaryText },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
    dateLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
  } as const;
}
