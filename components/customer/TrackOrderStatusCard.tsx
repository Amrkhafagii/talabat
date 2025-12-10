import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/ui/Card';
import OrderStatusBadge from '@/components/common/OrderStatusBadge';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

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
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const isOnTime = !etaAlert;

  return (
    <Card style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <View>
          <Text style={styles.orderNumber}>Order #{orderId.slice(-6).toUpperCase()} • {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <Text style={styles.arrivalText}>{etaWindow || estimatedDelivery || 'Arriving soon'}</Text>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        </View>
        <RealtimeIndicator />
      </View>
      <View style={styles.pillRow}>
        <View style={styles.statusPill}>
          <OrderStatusBadge status={status} size='large' />
        </View>
        <View style={[styles.statusPill, isOnTime ? styles.onTime : styles.delay]}>
          <Icon name={isOnTime ? 'CheckCircle' : 'AlertTriangle'} size="sm" color={isOnTime ? theme.colors.status.success : theme.colors.status.warning} />
          <Text style={[styles.pillLabel, isOnTime ? styles.onTimeText : styles.delayText]}>{isOnTime ? 'On Time' : 'Delayed'}</Text>
        </View>
      </View>
      {etaAlert && <Text style={styles.warningText}>{etaAlert}</Text>}
      {etaWindow && showTrustedEta && (
        <View style={styles.trustedEta}>
          <Icon name='ShieldCheck' size='sm' color={theme.colors.status.success} />
          <Text style={styles.trustedEtaText}>Trusted arrival {etaWindow}</Text>
        </View>
      )}
      <View style={styles.metaRow}>
        {safetyEvents.temp && (
          <Text style={styles.safetyLine}>Temp check passed</Text>
        )}
        {safetyEvents.handoff && (
          <Text style={styles.safetyLine}>Handoff confirmed</Text>
        )}
      </View>
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    statusCard: {
      marginBottom: 16,
      padding: 16,
    },
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 8,
    },
    orderNumber: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: theme.colors.textMuted,
    },
    arrivalText: {
      fontSize: 22,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    restaurantName: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      marginTop: 2,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 8,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceAlt,
    },
    onTime: {
      backgroundColor: theme.colors.statusSoft.success,
    },
    delay: {
      backgroundColor: theme.colors.statusSoft.warning,
    },
    pillLabel: { fontFamily: 'Inter-SemiBold', color: theme.colors.text },
    onTimeText: { color: theme.colors.status.success },
    delayText: { color: theme.colors.status.warning },
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
    metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    safetyLine: {
      fontSize: 12,
      color: theme.colors.status.success,
      fontFamily: 'Inter-Medium',
      marginTop: 4,
    },
    warningText: {
      color: theme.colors.status.warning,
      fontWeight: '600',
      marginBottom: 6,
    },
  });
