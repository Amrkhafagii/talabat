import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '@/components/ui/Button';
import DeliveryCard from '@/components/delivery/DeliveryCard';
import ProgressSteps from '@/components/ui/ProgressSteps';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Delivery = {
  id: string;
  status: string;
  order_id?: string | null;
  order?: any;
};

type Props = {
  deliveries: Delivery[];
  paddingHorizontal: number;
  onReport: (deliveryId?: string) => void;
  onCancel: (deliveryId?: string) => void;
  onCall: (phone: string) => void;
  onNavigate: (delivery: Delivery) => void;
  onPickup: (deliveryId: string) => void;
  onComplete: (deliveryId: string) => void;
  formatDeliveryForCard: (delivery: any) => any;
};

export function ActiveDeliverySection({
  deliveries,
  paddingHorizontal,
  onReport,
  onCancel,
  onCall,
  onNavigate,
  onPickup,
  onComplete,
  formatDeliveryForCard,
}: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme, paddingHorizontal), [theme, paddingHorizontal]);
  const active = deliveries[0];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Delivery</Text>
        <Text style={styles.liveIndicator}>Live</Text>
      </View>
      <View style={styles.progressWrap}>
        <ProgressSteps
          steps={[
            { key: 'assigned', label: 'Assigned', status: 'done' },
            { key: 'picked', label: 'Picked Up', status: active.status === 'picked_up' ? 'current' : active.status === 'delivered' ? 'done' : 'pending' },
            { key: 'delivered', label: 'Delivered', status: active.status === 'delivered' ? 'current' : 'pending' },
          ]}
        />
      </View>
      <View style={styles.activeActionsRow}>
        <Button
          title="Report Issue"
          variant="secondary"
          size="small"
          onPress={() => onReport(active?.id)}
          style={styles.inlineButton}
          pill
        />
        <Button
          title="Cancel Order"
          variant="secondary"
          size="small"
          onPress={() => onCancel(active?.id)}
          style={styles.inlineButton}
          pill
        />
      </View>
      <View style={styles.deliveryContainer}>
        {deliveries.map(delivery => (
          <DeliveryCard
            key={delivery.id}
            order={formatDeliveryForCard(delivery)}
            onCall={delivery.order?.user?.phone ? () => onCall(delivery.order?.user?.phone || '') : undefined}
            onNavigate={() => onNavigate(delivery)}
            onPickup={delivery.status === 'assigned' ? () => onPickup(delivery.id) : undefined}
            onComplete={delivery.status === 'picked_up' ? () => onComplete(delivery.id) : undefined}
          />
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
    progressWrap: { paddingHorizontal, marginBottom: theme.spacing.md },
    activeActionsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal,
      marginTop: theme.spacing.sm,
    },
    inlineButton: { flex: 1 },
    deliveryContainer: {
      paddingHorizontal,
      gap: theme.spacing.md,
    },
  });
