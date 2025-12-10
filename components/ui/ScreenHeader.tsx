import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
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
          <IconButton
            name="ArrowLeft"
            size="md"
            color={theme.colors.text}
            onPress={onBack}
            hitSlop={theme.tap.hitSlop}
            style={styles.iconButton}
          />
        ) : null}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {dateLabel && onDatePress ? (
            <TouchableOpacity onPress={onDatePress} style={styles.dateRow} hitSlop={theme.tap.hitSlop}>
              <Icon name="CalendarDays" size="sm" color={theme.colors.secondaryText} />
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
  const iconSize = Math.max(36, theme.tap.minHeight * 0.75);
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
      width: iconSize,
      height: iconSize,
      borderRadius: theme.radius.cta,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      ...theme.shadows.card,
    },
    title: { ...theme.typography.titleL, color: theme.colors.text },
    subtitle: { ...theme.typography.caption, color: theme.colors.secondaryText },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
    dateLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
  } as const;
}
