import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Props = {
  delayReason: string;
  creditStatus: 'idle' | 'issuing' | 'issued' | 'failed';
  backupPlan: { restaurantName: string; etaLabel: string; restaurantId: string } | null;
  rerouteStatus: 'idle' | 'sent' | 'declined';
  onAcceptCredit: () => void;
  onApproveReroute: () => void;
  onDeclineReroute: () => void;
};

export function TrackOrderDelayCard({
  delayReason,
  creditStatus,
  backupPlan,
  rerouteStatus,
  onAcceptCredit,
  onApproveReroute,
  onDeclineReroute,
}: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.delayCard}>
      <View style={styles.delayHeader}>
        <View style={styles.delayIcon}>
          <Icon name="Clock" size="sm" color={theme.colors.status.warning} />
        </View>
        <View style={styles.delayCopy}>
          <Text style={styles.delayTitle}>{delayReason}</Text>
          <Text style={styles.delayText}>Traffic is heavier than usual. You can accept a credit while we keep pushing the order.</Text>
        </View>
      </View>
      <Button
        title={creditStatus === 'issued' ? 'Credit applied' : creditStatus === 'issuing' ? 'Applying credit...' : 'Accept delay for credit'}
        onPress={onAcceptCredit}
        disabled={creditStatus === 'issuing' || creditStatus === 'issued'}
        style={styles.delayButton}
      />
      {creditStatus === 'failed' && <Text style={styles.delayError}>Could not apply credit. Please try again.</Text>}
      {backupPlan && (
        <View style={styles.planB}>
          <Text style={styles.planBTitle}>Plan B: {backupPlan.restaurantName}</Text>
          <Text style={styles.planBSubtitle}>Ready in {backupPlan.etaLabel}. Original may slip past current window.</Text>
          <View style={styles.planBActions}>
            <Button title={rerouteStatus === 'sent' ? 'Plan B requested' : 'Approve reroute'} onPress={onApproveReroute} disabled={rerouteStatus === 'sent'} />
            <Button title='Stay and wait' variant='outline' onPress={onDeclineReroute} />
          </View>
        </View>
      )}
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    delayCard: {
      marginBottom: 16,
      backgroundColor: theme.colors.statusSoft.warning,
      borderColor: theme.colors.status.warning,
      borderWidth: 1,
    },
    delayHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 8,
    },
    delayIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.status.warning,
    },
    delayCopy: { flex: 1, gap: 4 },
    delayTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.status.warning,
    },
    delayText: {
      fontSize: 14,
      color: theme.colors.status.warning,
      fontFamily: 'Inter-Regular',
      marginBottom: 12,
    },
    delayButton: {
      marginBottom: 8,
    },
    delayError: {
      fontSize: 12,
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
    },
    planB: {
      marginTop: 12,
      backgroundColor: theme.colors.surfaceAlt,
      padding: 12,
      borderRadius: 10,
      gap: 6,
    },
    planBTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      color: theme.colors.text,
    },
    planBSubtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    planBActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
  });
