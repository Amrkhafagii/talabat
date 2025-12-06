import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, TextInput, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import CopyChip from '@/app/components/CopyChip';
import { styles as adminStyles } from '@/styles/adminMetrics';
import { makeBadgeRenderer } from '@/utils/adminUi';
import type { MenuPhotoReview } from '@/utils/db/adminOps';
import { IOSCard } from '@/components/ios/IOSCard';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSStatusChip } from '@/components/ios/IOSStatusChip';
import { IOSPillButton } from '@/components/ios/IOSPillButton';
import { IOSTableActionRow } from '@/components/ios/IOSTableActionRow';
import { IOSSkeleton } from '@/components/ios/IOSSkeleton';

export type PhotoReviewListProps = {
  items: MenuPhotoReview[];
  loading: boolean;
  statusText: string | null;
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, reason?: string) => void;
};

const renderBadge = makeBadgeRenderer(adminStyles);
const rejectReasons = [
  { key: 'blurry', label: 'Blurry' },
  { key: 'incomplete', label: 'Missing items' },
  { key: 'inappropriate', label: 'Inappropriate' },
  { key: 'low_quality', label: 'Low quality' },
  { key: 'brand_violation', label: 'Brand violation' },
];

export default function PhotoReviewList({ items, loading, statusText, onApprove, onReject }: PhotoReviewListProps) {
  if (loading) return <SkeletonCard />;
  const [notes, setNotes] = useState<Record<string, string>>({});

  const ageBadge = (iso?: string | null) => {
    if (!iso) return null;
    const ageHours = Math.floor((Date.now() - new Date(iso).getTime()) / 1000 / 60 / 60);
    if (ageHours >= 48) return { label: `${ageHours}h`, state: 'failed' as const, helper: 'Over 48h' };
    if (ageHours >= 24) return { label: `${ageHours}h`, state: 'review' as const, helper: 'Over 24h' };
    return { label: `${ageHours}h`, state: 'initiated' as const, helper: 'Fresh' };
  };

  const handleApprove = (item: MenuPhotoReview) => {
    Alert.alert('Approve photo?', item.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', style: 'default', onPress: () => onApprove(item.menu_item_id, notes[item.menu_item_id]) },
    ]);
  };

  const handleReject = (item: MenuPhotoReview, reasonKey: string, reasonLabel: string) => {
    const note = notes[item.menu_item_id];
    const detail = [reasonLabel, note ? `Note: ${note}` : null].filter(Boolean).join('\n');
    Alert.alert('Reject photo?', detail || reasonLabel, [
      { text: 'Back', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => onReject(item.menu_item_id, note ? `${reasonKey}:${note}` : reasonKey) },
    ]);
  };

  return (
    <>
      {statusText && <Text style={adminStyles.status}>{statusText}</Text>}
      {items.length === 0 ? (
        <Text style={adminStyles.helperText}>No pending menu photos right now. Refresh or check menu upload pipeline if you expect new ones.</Text>
      ) : (
        items.map(item => {
          const age = ageBadge(item.updated_at);
          return (
            <IOSCard key={item.menu_item_id} padding="md" style={cardStyles.card}>
              <View style={cardStyles.headerRow}>
                <View>
                  <Text style={cardStyles.title}>{item.name}</Text>
                  <Text style={cardStyles.meta}>Restaurant: {item.restaurant_name}</Text>
                  <Text style={cardStyles.meta}>Updated: {item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}</Text>
                  {!item.restaurant_has_payout && (
                    <Text style={[cardStyles.meta, cardStyles.warn]}>Restaurant payout info missing; flag before approval.</Text>
                  )}
                </View>
                <IOSStatusChip label={age ? age.helper : 'Pending'} tone={age?.state === 'failed' ? 'error' : 'info'} />
              </View>
              {item.image ? (
                <TouchableOpacity style={cardStyles.thumbRow} onPress={() => Linking.openURL(item.image)}>
                  <Image source={{ uri: item.image }} style={cardStyles.thumb} />
                  <Text style={cardStyles.link}>Open photo</Text>
                </TouchableOpacity>
              ) : (
                <CopyChip label="Photo" value={item.image} />
              )}
              {item.photo_approval_notes ? (
                <Text style={[cardStyles.meta, cardStyles.warn]}>Notes: {item.photo_approval_notes}</Text>
              ) : null}
              <Text style={cardStyles.meta}>{age ? `Age: ${age.label}` : 'Age: —'} • Audit: {item.photo_approval_notes || 'None recorded'}</Text>
              <TextInput
                value={notes[item.menu_item_id] ?? ''}
                onChangeText={(val) => setNotes(prev => ({ ...prev, [item.menu_item_id]: val }))}
                placeholder="Add note (optional) before deciding"
                style={[cardStyles.input, { marginTop: 8 }]}
                multiline
              />
              <IOSTableActionRow
                title="Menu photo review"
                meta={`Restaurant: ${item.restaurant_name}`}
                onLeftPress={() => handleApprove(item)}
                onRightPress={() => handleReject(item, 'reject', 'Reject')}
              />
              <View style={cardStyles.rejectRow}>
                {rejectReasons.map((r) => (
                  <IOSPillButton
                    key={r.key}
                    label={r.label}
                    variant="ghost"
                    size="sm"
                    onPress={() => handleReject(item, r.key, r.label)}
                  />
                ))}
              </View>
            </IOSCard>
          );
        })
      )}
    </>
  );
}

const SkeletonCard = () => (
  <IOSCard padding="md" style={{ opacity: 0.6 }}>
    <IOSSkeleton rows={4} />
  </IOSCard>
);

const cardStyles = StyleSheet.create({
  card: { marginBottom: iosSpacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: iosSpacing.xs },
  title: { ...iosTypography.headline },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText },
  warn: { color: iosColors.destructive },
  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: iosSpacing.sm, marginVertical: iosSpacing.sm },
  thumb: { width: 96, height: 60, borderRadius: iosRadius.sm, backgroundColor: iosColors.surfaceAlt },
  link: { ...iosTypography.subhead, color: iosColors.primary },
  input: {
    borderWidth: 1,
    borderColor: iosColors.separator,
    borderRadius: iosRadius.md,
    padding: iosSpacing.sm,
    backgroundColor: iosColors.surface,
    ...iosTypography.body,
  },
  rejectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: iosSpacing.xs, marginTop: iosSpacing.sm },
});
