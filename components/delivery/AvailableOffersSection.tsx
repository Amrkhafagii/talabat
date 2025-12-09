import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import DeliveryCard from '@/components/delivery/DeliveryCard';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Delivery = {
  id: string;
  status: string;
  order?: any;
};

type Props = {
  paddingHorizontal: number;
  loading: boolean;
  availableDeliveries: Delivery[];
  error?: string | null;
  onAccept: (delivery: Delivery) => void;
  formatDeliveryForCard: (delivery: any) => any;
};

export function AvailableOffersSection({ paddingHorizontal, loading, availableDeliveries, error, onAccept, formatDeliveryForCard }: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme, paddingHorizontal), [theme, paddingHorizontal]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Offers</Text>
        <Text style={styles.liveIndicator}>Live</Text>
      </View>
      <View style={styles.ordersContainer}>
        {loading && availableDeliveries.length === 0 ? (
          <View style={styles.deliveriesLoading}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.deliveriesLoadingText}>Looking for offers...</Text>
          </View>
        ) : availableDeliveries.length > 0 ? (
          availableDeliveries.map(delivery => (
            <DeliveryCard key={delivery.id} order={formatDeliveryForCard(delivery)} onAccept={() => onAccept(delivery)} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No deliveries available</Text>
            <Text style={styles.emptyText}>New requests will appear in real-time</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorState}>
            <Text style={styles.errorStateText}>{error}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, paddingHorizontal: number) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
      paddingHorizontal,
      marginBottom: theme.spacing.md,
    },
    liveIndicator: {
      ...theme.typography.caption,
      color: theme.colors.success,
      backgroundColor: `${theme.colors.success}22`,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
    },
    ordersContainer: {
      paddingHorizontal,
      gap: theme.spacing.md,
    },
    deliveriesLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    deliveriesLoadingText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl2,
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    errorState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      backgroundColor: `${theme.colors.status.error}11`,
      borderRadius: theme.radius.md,
      marginVertical: theme.spacing.sm,
    },
    errorStateText: {
      ...theme.typography.caption,
      color: theme.colors.status.error,
    },
  });
