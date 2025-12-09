import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSBadge } from '@/components/ios/IOSBadge';
import { iosSpacing, iosTypography, iosColors, iosRadius } from '@/styles/iosTheme';
import { money } from '@/utils/adminUi';
import type { PaymentReviewItem } from '@/utils/db/admin';
import { IOSSkeleton } from '@/components/ios/IOSSkeleton';

export type PaymentReviewListProps = {
  items: PaymentReviewItem[];
  loading: boolean;
  error: string | null;
  mismatch: (item: PaymentReviewItem) => boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
};

const ageBadge = (iso?: string | null) => {
  if (!iso) return null;
  const ageHours = Math.floor((Date.now() - new Date(iso).getTime()) / 1000 / 60 / 60);
  if (ageHours >= 48) return { label: `${ageHours}h`, state: 'failed' as const, helper: 'Over 48h' };
  if (ageHours >= 24) return { label: `${ageHours}h`, state: 'review' as const, helper: 'Over 24h' };
  return { label: `${ageHours}h`, state: 'initiated' as const, helper: 'Fresh' };
};

export default function PaymentReviewList({ items, loading, error, mismatch, onApprove, onReject }: PaymentReviewListProps) {
  const handleApprove = (item: PaymentReviewItem) => {
    Haptics.selectionAsync().catch(() => {});
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
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(
      'Reject payment?',
      reasonLabel,
      [
        { text: 'Back', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => onReject(item.id, reasonKey) },
      ]
    );
  };

  if (loading) return <SkeletonCard />;
  if (error) return <Text style={cardStyles.helperWarn}>{error} • Try refresh or check ingest jobs.</Text>;
  if (items.length === 0) return <Text style={cardStyles.helper}>No pending payments right now. Use refresh if you expect receipts, or verify the ingest queue.</Text>;

  return (
    <>
      {items.map(item => {
        const age = ageBadge(item.created_at);
        const status = (item as any).payment_status || 'Pending';
        const headerStatus = mismatch(item) ? 'Mismatch' : status;
        return (
          <IOSCard key={item.id} padding="sm" style={[cardStyles.card, mismatch(item) && cardStyles.cardWarn]}>
            <View style={cardStyles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={cardStyles.title}>Payment ID: #{item.id}</Text>
                <Text style={cardStyles.meta}>User: {item.user_id ?? '—'}    Date: {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</Text>
                <Text style={cardStyles.meta}>Amount: ${money(item.total_charged ?? item.total ?? 0)}    Status: {headerStatus}</Text>
              </View>
              <View style={cardStyles.badgeRow}>
                {mismatch(item) && <IOSBadge label="Mismatch" tone="error" />}
                {age && <IOSBadge label={age.helper} tone={age.state === 'failed' ? 'error' : 'warning'} />}
              </View>
            </View>
            <View style={cardStyles.actions}>
              <TouchableOpacity style={cardStyles.approveBtn} onPress={() => handleApprove(item)}>
                <Text style={cardStyles.approveText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cardStyles.rejectBtn} onPress={() => handleReject(item, 'reject', 'Reject')}>
                <Text style={cardStyles.rejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </IOSCard>
        );
      })}
    </>
  );
}

const SkeletonCard = () => (
  <IOSCard padding="md" style={{ opacity: 0.6 }}>
    <IOSSkeleton rows={4} />
  </IOSCard>
);

const cardStyles = StyleSheet.create({
  card: { marginBottom: iosSpacing.sm, borderRadius: iosRadius.lg },
  cardWarn: { borderColor: iosColors.warning, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: iosSpacing.sm },
  title: { ...iosTypography.subhead },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText },
  badgeRow: { flexDirection: 'row', gap: iosSpacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: iosSpacing.xs, marginTop: iosSpacing.xs },
  approveBtn: {
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xs,
    borderRadius: iosRadius.md,
    backgroundColor: iosColors.primary,
  },
  approveText: { ...iosTypography.caption, color: iosColors.textInverse, fontWeight: '700' },
  rejectBtn: {
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xs,
    borderRadius: iosRadius.md,
    backgroundColor: iosColors.surfaceAlt,
    borderWidth: 1,
    borderColor: iosColors.separator,
  },
  rejectText: { ...iosTypography.caption, color: iosColors.destructive, fontWeight: '700' },
  helper: { ...iosTypography.caption, color: iosColors.secondaryText, marginVertical: iosSpacing.xs },
  helperWarn: { ...iosTypography.caption, color: iosColors.destructive, marginVertical: iosSpacing.xs },
});
