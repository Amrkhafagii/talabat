import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Action = { icon: string; label: string; onPress: () => void };

type Props = {
  actions: Action[];
  paddingHorizontal: number;
};

export function DashboardQuickActions({ actions, paddingHorizontal }: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme, paddingHorizontal), [theme, paddingHorizontal]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        {actions.map(action => (
          <TouchableOpacity key={action.label} style={styles.actionCard} onPress={action.onPress}>
            <Icon name={action.icon as any} size="md" color={theme.colors.accent} />
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, paddingHorizontal: number) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
      paddingHorizontal,
      marginBottom: theme.spacing.md,
    },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: paddingHorizontal - theme.spacing.sm,
      gap: theme.spacing.md,
    },
    actionCard: {
      width: '47%',
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.card,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    actionText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.text,
      marginTop: theme.spacing.xs,
    },
  });
