import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import type { OpsAlertsSnapshot } from '@/utils/db/adminOps';

type Props = {
  snapshot: OpsAlertsSnapshot | null;
};

export default function AlertsSnapshot({ snapshot }: Props) {
  if (!snapshot) return <Text style={styles.row}>No snapshot available.</Text>;
  return (
    <View style={styles.card}>
      <Text style={styles.row}>
        Pending beyond SLA — Restaurant: {snapshot.pending_beyond_sla.restaurant} | Driver: {snapshot.pending_beyond_sla.driver} ({'>'}{snapshot.pending_beyond_sla.threshold_hours}h)
      </Text>
      <Text style={styles.row}>
        Payout failure rate — Restaurant: {Number(snapshot.payout_failure_rate.restaurant ?? 0).toFixed(3)} | Driver: {Number(snapshot.payout_failure_rate.driver ?? 0).toFixed(3)} (cap {snapshot.payout_failure_rate.cap})
      </Text>
      <Text style={styles.row}>Payment review backlog: {snapshot.payment_review_backlog}</Text>
      <Text style={styles.row}>Payment proof rate limited (24h): {snapshot.payment_proof_rate_limited_24h}</Text>
      <Text style={styles.row}>Reconciliation unmatched (48h): {snapshot.reconciliation_unmatched_48h}</Text>
    </View>
  );
}
