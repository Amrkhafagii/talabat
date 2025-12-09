import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import type { OpsPlaybook } from '@/utils/db/admin';

type Props = { playbook: OpsPlaybook | null };

export default function PayoutFailurePlaybook({ playbook }: Props) {
  if (playbook?.payout_failures?.steps) {
    return (
      <View style={styles.card}>
        {playbook.payout_failures.steps.map((step, idx) => (
          <Text key={`pf-${idx}`} style={styles.row}>
            • {step}
          </Text>
        ))}
      </View>
    );
  }
  return <Text style={styles.row}>No playbook available.</Text>;
}
