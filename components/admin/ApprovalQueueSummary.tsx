import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '@/styles/adminMetrics';

type Props = {
  approvalsCount: number;
  payoutsCount: number;
  orderIssues: number;
  deliveryIssues: number;
};

export function ApprovalQueueSummary({ approvalsCount, payoutsCount, orderIssues, deliveryIssues }: Props) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.sectionTitle}>Queues & Alerts</Text>
        <Text style={styles.metaRow}>
          Orders: {orderIssues} • Deliveries: {deliveryIssues}
        </Text>
      </View>
      <View style={styles.feeGrid}>
        <View style={styles.feeCell}>
          <Text style={styles.feeLabel}>Approvals backlog</Text>
          <Text style={styles.feeValue}>{approvalsCount}</Text>
        </View>
        <View style={styles.feeCell}>
          <Text style={styles.feeLabel}>Payout backlog</Text>
          <Text style={styles.feeValue}>{payoutsCount}</Text>
        </View>
        <View style={styles.feeCell}>
          <Text style={styles.feeLabel}>Order issues</Text>
          <Text style={styles.feeValue}>{orderIssues}</Text>
        </View>
        <View style={styles.feeCell}>
          <Text style={styles.feeLabel}>Delivery issues</Text>
          <Text style={styles.feeValue}>{deliveryIssues}</Text>
        </View>
      </View>
    </View>
  );
}

export default ApprovalQueueSummary;
