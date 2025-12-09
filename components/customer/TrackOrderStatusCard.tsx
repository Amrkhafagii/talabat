import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/ui/Card';
import OrderStatusBadge from '@/components/common/OrderStatusBadge';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/styles/appTheme';

type Props = {
  orderId: string;
  restaurantName?: string | null;
  createdAt: string;
  status: string;
  etaWindow: string | null;
  showTrustedEta: boolean;
  etaAlert: string | null;
  safetyEvents: { temp?: string; handoff?: string };
  estimatedDelivery?: string | null;
};

export function TrackOrderStatusCard({
  orderId,
  restaurantName,
  createdAt,
  status,
  etaWindow,
  showTrustedEta,
  etaAlert,
  safetyEvents,
  estimatedDelivery,
}: Props) {
  const theme = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <Text style={styles.orderNumber}>Order #{orderId.slice(-6).toUpperCase()}</Text>
        <OrderStatusBadge status={status} size='large' />
      </View>
      {etaAlert && <Text style={styles.warningText}>{etaAlert}</Text>}
      <Text style={styles.restaurantName}>{restaurantName}</Text>
      <Text style={styles.orderTime}>Ordered {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      {etaWindow && showTrustedEta && (
        <View style={styles.trustedEta}>
          <Icon name='ShieldCheck' size='sm' color={theme.colors.status.success} />
          <Text style={styles.trustedEtaText}>Trusted arrival {etaWindow}</Text>
        </View>
      )}
      {safetyEvents.temp && (
        <Text style={styles.safetyLine}>Temp check passed at {new Date(safetyEvents.temp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      )}
      {safetyEvents.handoff && (
        <Text style={styles.safetyLine}>Handoff confirmed at {new Date(safetyEvents.handoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      )}
      {estimatedDelivery && <Text style={styles.estimatedTime}>Estimated delivery: {estimatedDelivery}</Text>}
      <RealtimeIndicator />
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    statusCard: {
      marginBottom: 16,
    },
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    orderNumber: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    restaurantName: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      marginBottom: 4,
    },
    orderTime: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    trustedEta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
      padding: 10,
      backgroundColor: theme.colors.statusSoft.success,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.status.success,
    },
    trustedEtaText: {
      fontSize: 14,
      color: theme.colors.status.success,
      fontFamily: 'Inter-SemiBold',
    },
    safetyLine: {
      fontSize: 12,
      color: theme.colors.status.success,
      fontFamily: 'Inter-Medium',
      marginTop: 4,
    },
    estimatedTime: {
      fontSize: 14,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-SemiBold',
      marginTop: 4,
    },
    warningText: {
      color: theme.colors.status.warning,
      fontWeight: '600',
      marginBottom: 6,
    },
  });
