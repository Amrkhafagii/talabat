import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '@/styles/adminMetrics';

export default function AdminWorkflow() {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Admin workflow</Text>
      <Text style={styles.helperText}>
        - Payments: verify receipt/amount/txn. Approve to mark paid; reject if mismatch or missing proof. SLA: under 15 min.
      </Text>
      <Text style={styles.helperText}>
        - Driver licenses: check clear document, license number, and payout info present. Approve sets driver verified. SLA: same-day.
      </Text>
      <Text style={styles.helperText}>
        - Menu photos: ensure the image is clear and appropriate; reject blurry or off-brand photos. SLA: 24h.
      </Text>
      <Text style={styles.helperText}>
        Always confirm payout details exist before approving to reduce payout failures.
      </Text>
    </View>
  );
}
