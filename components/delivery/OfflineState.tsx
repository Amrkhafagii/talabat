import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export function OfflineState() {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.offlineState}>
      <Icon name="Truck" size={48} color={theme.colors.textMuted} />
      <Text style={styles.offlineTitle}>You&apos;re offline</Text>
      <Text style={styles.offlineText}>Go online to start receiving delivery requests</Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    offlineState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl2,
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    offlineTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
    },
    offlineText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  });
