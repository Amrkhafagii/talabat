import React, { useMemo } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Card from '../ui/Card';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface StatCardProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  value: string | number;
  label: string;
  iconColor?: string;
  helperText?: string;
}

export default function StatCard({
  icon: Icon,
  value,
  label,
  iconColor,
  helperText,
}: StatCardProps) {
  const theme = useRestaurantTheme();
  const resolvedIconColor = iconColor || theme.colors.accent;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.statCard} padding={theme.spacing.md}>
      <View style={styles.iconWrapper}>
        <Icon size={22} color={resolvedIconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {helperText && <Text style={styles.statHelper}>{helperText}</Text>}
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    statCard: {
      flex: 1,
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      ...theme.shadows.card,
    },
    iconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${theme.colors.accent}22`,
    },
    statValue: {
      ...theme.typography.titleM,
      color: theme.colors.text,
    },
    statLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSubtle,
    },
    statHelper: {
      ...theme.typography.caption,
      color: theme.colors.status.info,
    },
  });
