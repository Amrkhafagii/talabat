import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppTheme } from '@/styles/appTheme';

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
  const theme = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.delayCard}>
      <View style={styles.delayHeader}>
        <Text style={styles.delayTitle}>{delayReason}</Text>
        <Text style={styles.delayBadge}>Monitoring</Text>
      </View>
      <Text style={styles.delayText}>We spotted a risk to your ETA. You can accept a small credit while we keep pushing this order.</Text>
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

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    delayCard: {
      marginBottom: 16,
      backgroundColor: theme.colors.statusSoft.warning,
      borderColor: theme.colors.status.warning,
      borderWidth: 1,
    },
    delayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    delayTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.status.warning,
    },
    delayBadge: {
      fontSize: 12,
      color: theme.colors.status.warning,
      backgroundColor: theme.colors.statusSoft.warning,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      fontFamily: 'Inter-Medium',
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
