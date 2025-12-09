import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/ui/Card';
import ProgressSteps from '@/components/ui/ProgressSteps';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Props = {
  normalizedStatus: 'assigned' | 'picked_up' | 'delivered';
  stepStatusFor: (step: 'assigned' | 'picked_up' | 'delivered') => 'done' | 'current' | 'pending';
};

export function NavigationStatusCard({ normalizedStatus, stepStatusFor }: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Status</Text>
      <ProgressSteps
        steps={[
          { key: 'assigned', label: 'Assigned', status: stepStatusFor('assigned') },
          { key: 'picked_up', label: 'Picked Up', status: stepStatusFor('picked_up') },
          { key: 'delivered', label: 'Delivered', status: stepStatusFor('delivered') },
        ]}
      />
      <Text style={styles.helper}>
        Current: {normalizedStatus === 'assigned' ? 'Pickup' : normalizedStatus === 'picked_up' ? 'On the way' : 'Delivered'}
      </Text>
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
    },
    title: {
      ...theme.typography.titleM,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    helper: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.sm,
    },
  });
