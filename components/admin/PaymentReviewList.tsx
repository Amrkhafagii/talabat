import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import * as Linking from 'expo-linking';
import CopyChip from '@/app/components/CopyChip';
import { styles } from '@/styles/adminMetrics';
import { money, looksLikeImage, safeUrl, expectedPaymentAmount, makeBadgeRenderer } from '@/utils/adminUi';
import type { PaymentReviewItem } from '@/utils/db/adminOps';

export type PaymentReviewListProps = {
  items: PaymentReviewItem[];
  loading: boolean;
  error: string | null;
  mismatch: (item: PaymentReviewItem) => boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
};

const renderBadge = makeBadgeRenderer(styles);
const rejectReasons = [
  { key: 'mismatch', label: 'Amount mismatch' },
  { key: 'invalid_receipt', label: 'Invalid receipt' },
  { key: 'duplicate', label: 'Duplicate txn' },
  { key: 'fraud_suspect', label: 'Fraud suspect' },
  { key: 'unclear_receipt', label: 'Unclear receipt' },
  { key: 'partial_payment', label: 'Partial payment' },
  { key: 'test_submission', label: 'Test submission' },
];

const ageBadge = (iso?: string | null) => {
  if (!iso) return null;
  const ageHours = Math.floor((Date.now() - new Date(iso).getTime()) / 1000 / 60 / 60);
  if (ageHours >= 48) return { label: `${ageHours}h`, state: 'failed' as const, helper: 'Over 48h' };
  if (ageHours >= 24) return { label: `${ageHours}h`, state: 'review' as const, helper: 'Over 24h' };
  return { label: `${ageHours}h`, state: 'initiated' as const, helper: 'Fresh' };
};

export default function PaymentReviewList({ items, loading, error, mismatch, onApprove, onReject }: PaymentReviewListProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleApprove = (item: PaymentReviewItem) => {
    Alert.alert(
      'Approve payment?',
      `Order ${item.id.slice(-6).toUpperCase()} • ${money(item.total_charged ?? item.total ?? 0)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', style: 'default', onPress: () => onApprove(item.id) },
      ]
    );
  };

  const handleReject = (item: PaymentReviewItem, reasonKey: string, reasonLabel: string) => {
    const note = notes[item.id];
    const detail = [reasonLabel, note ? `Note: ${note}` : null].filter(Boolean).join('\n');
    Alert.alert(
      'Reject payment?',
      detail || reasonLabel,
      [
        { text: 'Back', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => onReject(item.id, note ? `${reasonKey}:${note}` : reasonKey) },
      ]
    );
  };

  if (loading) return <SkeletonCard />;
  if (error) return <Text style={[styles.helperText, styles.warningText]}>{error} • Try refresh or check ingest jobs.</Text>;
  if (items.length === 0) return <Text style={styles.helperText}>No pending payments right now. Use refresh if you expect receipts, or verify the ingest queue.</Text>;

  return (
    <>
      {items.map(item => {
        const receipt = safeUrl(item.receipt_url);
        const age = ageBadge(item.created_at);
        return (
          <View key={item.id} style={[styles.card, mismatch(item) && styles.warningCard]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.title}>Order {item.id.slice(-6).toUpperCase()}</Text>
                <Text style={styles.metaRow}>Submitted: {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</Text>
                <Text style={styles.metaRow}>Restaurant: {item.restaurant_id ?? '—'}</Text>
                <Text style={styles.metaRow}>Customer: {item.user_id ?? '—'}</Text>
              </View>
              <View style={styles.badgeRow}>
                {renderBadge('Payment review', 'review')}
                {mismatch(item) && renderBadge('Mismatch', 'failed')}
                {age && renderBadge(age.helper, age.state)}
              </View>
            </View>
            <Text style={styles.row}>Txn: {item.customer_payment_txn_id ?? '—'}</Text>
            <CopyChip label="Copy txn" value={item.customer_payment_txn_id ?? undefined} />
            <Text style={styles.row}>Receipt:</Text>
            {receipt ? (
              looksLikeImage(receipt) ? (
                <TouchableOpacity style={styles.thumbRow} onPress={() => Linking.openURL(receipt)} accessibilityRole="link">
                  <Image source={{ uri: receipt }} style={styles.thumb} />
                  <Text style={styles.linkText}>Open receipt (zoom)</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.thumbRow} onPress={() => Linking.openURL(receipt)} accessibilityRole="link">
                  <Text style={styles.linkText}>Open receipt link</Text>
                </TouchableOpacity>
              )
            ) : (
              <Text style={[styles.helperText, styles.warningText]}>No receipt uploaded or link invalid.</Text>
            )}
            {receipt && <CopyChip label="Copy receipt link" value={receipt} />}
            <Text style={styles.row}>Reported: {money(item.total_charged ?? item.total ?? 0)}</Text>
            <View style={styles.feeGrid}>
              <View style={styles.feeCell}>
                <Text style={styles.feeLabel}>Subtotal</Text>
                <Text style={styles.feeValue}>${money(item.subtotal)}</Text>
              </View>
              <View style={styles.feeCell}>
                <Text style={styles.feeLabel}>Delivery</Text>
                <Text style={styles.feeValue}>${money(item.delivery_fee)}</Text>
              </View>
              <View style={styles.feeCell}>
                <Text style={styles.feeLabel}>Tax</Text>
                <Text style={styles.feeValue}>${money(item.tax_amount)}</Text>
              </View>
              <View style={styles.feeCell}>
                <Text style={styles.feeLabel}>Platform fee</Text>
                <Text style={styles.feeValue}>${money(item.platform_fee)}</Text>
              </View>
            </View>
            <Text style={[styles.row, mismatch(item) && styles.warningText]}>
              Expected: {expectedPaymentAmount(item).toFixed(2)} • Mismatch: {mismatch(item) ? 'Yes' : 'No'}
            </Text>
            {mismatch(item) && <Text style={[styles.row, styles.warningText]}>Flagged: amount mismatch or txn duplicate</Text>}
            <Text style={styles.metaRow}>Reasons: {mismatch(item) ? 'Mismatch likely' : 'Verify receipt clarity'}</Text>
            <Text style={styles.metaRow}>{age ? `Age: ${age.label}` : 'Age: —'} • Audit: None recorded</Text>
            <TextInput
              value={notes[item.id] ?? ''}
              onChangeText={(val) => setNotes(prev => ({ ...prev, [item.id]: val }))}
              placeholder="Add note (optional) before deciding"
              style={[styles.input, { marginTop: 8 }]}
              multiline
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={() => handleApprove(item)}>
                <Text style={styles.buttonText}>Approve</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {rejectReasons.map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.button, styles.buttonGhost, { paddingHorizontal: 10, paddingVertical: 6 }]}
                    onPress={() => handleReject(item, r.key, r.label)}
                  >
                    <Text style={styles.secondaryButtonText}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}

const SkeletonCard = () => (
  <View style={[styles.card, { opacity: 0.6 }]}> 
    <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 8 }} />
    <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 6, width: '80%' }} />
    <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 6, width: '60%' }} />
    <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 6, width: '50%' }} />
  </View>
);
