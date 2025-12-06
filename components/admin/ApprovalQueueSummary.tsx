import React from 'react';
import { View, Text } from 'react-native';
import { styles as adminStyles } from '@/styles/adminMetrics';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSBadge } from '@/components/ios/IOSBadge';
import { iosSpacing, iosTypography } from '@/styles/iosTheme';

type Props = {
  approvalsCount: number;
  payoutsCount: number;
  orderIssues: number;
  deliveryIssues: number;
  useIos?: boolean;
};

export function ApprovalQueueSummary({ approvalsCount, payoutsCount, orderIssues, deliveryIssues, useIos = false }: Props) {
  if (useIos) {
    return (
      <IOSCard padding="md" style={{ marginBottom: iosSpacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: iosSpacing.xs }}>
          <Text style={iosTypography.headline}>Queues & Alerts</Text>
          <IOSBadge label={`Orders: ${orderIssues} • Deliveries: ${deliveryIssues}`} tone="neutral" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: iosSpacing.xs }}>
          <IOSBadge label={`Approvals: ${approvalsCount}`} tone="info" />
          <IOSBadge label={`Payouts: ${payoutsCount}`} tone="info" />
          <IOSBadge label={`Order issues: ${orderIssues}`} tone="warning" />
          <IOSBadge label={`Delivery issues: ${deliveryIssues}`} tone="warning" />
        </View>
      </IOSCard>
    );
  }

  return (
    <View style={adminStyles.sectionCard}>
      <View style={adminStyles.cardHeaderRow}>
        <Text style={adminStyles.sectionTitle}>Queues & Alerts</Text>
        <Text style={adminStyles.metaRow}>
          Orders: {orderIssues} • Deliveries: {deliveryIssues}
        </Text>
      </View>
      <View style={adminStyles.feeGrid}>
        <View style={adminStyles.feeCell}>
          <Text style={adminStyles.feeLabel}>Approvals backlog</Text>
          <Text style={adminStyles.feeValue}>{approvalsCount}</Text>
        </View>
        <View style={adminStyles.feeCell}>
          <Text style={adminStyles.feeLabel}>Payout backlog</Text>
          <Text style={adminStyles.feeValue}>{payoutsCount}</Text>
        </View>
        <View style={adminStyles.feeCell}>
          <Text style={adminStyles.feeLabel}>Order issues</Text>
          <Text style={adminStyles.feeValue}>{orderIssues}</Text>
        </View>
        <View style={adminStyles.feeCell}>
          <Text style={adminStyles.feeLabel}>Delivery issues</Text>
          <Text style={adminStyles.feeValue}>{deliveryIssues}</Text>
        </View>
      </View>
    </View>
  );
}

export default ApprovalQueueSummary;
