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
  iconColor = '#FF6B35',
  helperText,
}: StatCardProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.statCard}>
      <View style={styles.iconWrapper}>
        <Icon size={24} color={iconColor} />
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
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    iconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${theme.colors.accent}22`,
    },
    statValue: {
      fontSize: 22,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    statLabel: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      fontFamily: 'Inter-Regular',
    },
    statHelper: {
      ...theme.typography.caption,
      color: theme.colors.status.info,
    },
  });
