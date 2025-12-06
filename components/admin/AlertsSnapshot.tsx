import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { styles as adminStyles } from '@/styles/adminMetrics';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSBadge } from '@/components/ios/IOSBadge';
import { iosColors, iosSpacing, iosTypography } from '@/styles/iosTheme';
import type { OpsAlertsSnapshot } from '@/utils/db/adminOps';

type Props = {
  snapshot: OpsAlertsSnapshot | null;
  useIos?: boolean;
};

export default function AlertsSnapshot({ snapshot, useIos = false }: Props) {
  if (!snapshot) return <Text style={useIos ? iosTypography.caption : adminStyles.row}>No snapshot available.</Text>;

  if (useIos) {
    return (
      <IOSCard padding="md" style={{ marginBottom: iosSpacing.sm }}>
        <Text style={iosTypography.headline}>Alerts snapshot</Text>
        <View style={{ gap: iosSpacing.xs, marginTop: iosSpacing.xs }}>
          <Row label="Pending beyond SLA" value={`R: ${snapshot.pending_beyond_sla.restaurant} • D: ${snapshot.pending_beyond_sla.driver} (> ${snapshot.pending_beyond_sla.threshold_hours}h)`} />
          <Row label="Payout failure rate" value={`R: ${Number(snapshot.payout_failure_rate.restaurant ?? 0).toFixed(3)} • D: ${Number(snapshot.payout_failure_rate.driver ?? 0).toFixed(3)} (cap ${snapshot.payout_failure_rate.cap})`} />
          <Row label="Payment review backlog" value={`${snapshot.payment_review_backlog}`} />
          <Row label="Payment proof rate limited (24h)" value={`${snapshot.payment_proof_rate_limited_24h}`} />
          <Row label="Reconciliation unmatched (48h)" value={`${snapshot.reconciliation_unmatched_48h}`} />
        </View>
      </IOSCard>
    );
  }

  return (
    <View style={adminStyles.card}>
      <Text style={adminStyles.row}>
        Pending beyond SLA — Restaurant: {snapshot.pending_beyond_sla.restaurant} | Driver: {snapshot.pending_beyond_sla.driver} ({'>'}{snapshot.pending_beyond_sla.threshold_hours}h)
      </Text>
      <Text style={adminStyles.row}>
        Payout failure rate — Restaurant: {Number(snapshot.payout_failure_rate.restaurant ?? 0).toFixed(3)} | Driver: {Number(snapshot.payout_failure_rate.driver ?? 0).toFixed(3)} (cap {snapshot.payout_failure_rate.cap})
      </Text>
      <Text style={adminStyles.row}>Payment review backlog: {snapshot.payment_review_backlog}</Text>
      <Text style={adminStyles.row}>Payment proof rate limited (24h): {snapshot.payment_proof_rate_limited_24h}</Text>
      <Text style={adminStyles.row}>Reconciliation unmatched (48h): {snapshot.reconciliation_unmatched_48h}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={iosStyles.row}>
      <Text style={iosStyles.label}>{label}</Text>
      <Text style={iosStyles.value}>{value}</Text>
    </View>
  );
}

const iosStyles = StyleSheet.create({
  row: { gap: 2 },
  label: { ...iosTypography.caption, color: iosColors.secondaryText },
  value: { ...iosTypography.subhead },
});
