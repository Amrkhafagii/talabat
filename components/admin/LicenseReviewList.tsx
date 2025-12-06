import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, TextInput, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import CopyChip from '@/app/components/CopyChip';
import { styles as adminStyles } from '@/styles/adminMetrics';
import { makeBadgeRenderer } from '@/utils/adminUi';
import type { DriverLicenseReview } from '@/utils/db/adminOps';
import { IOSCard } from '@/components/ios/IOSCard';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSStatusChip } from '@/components/ios/IOSStatusChip';
import { IOSPillButton } from '@/components/ios/IOSPillButton';
import { IOSTableActionRow } from '@/components/ios/IOSTableActionRow';
import { IOSSkeleton } from '@/components/ios/IOSSkeleton';

export type LicenseReviewListProps = {
  items: DriverLicenseReview[];
  loading: boolean;
  statusText: string | null;
  onApprove: (driverId: string, notes?: string) => void;
  onReject: (driverId: string, reason?: string) => void;
};

const renderBadge = makeBadgeRenderer(adminStyles);
const rejectReasons = [
  { key: 'blurry', label: 'Blurry' },
  { key: 'expired', label: 'Expired' },
  { key: 'mismatch', label: 'Data mismatch' },
  { key: 'incomplete', label: 'Incomplete docs' },
  { key: 'illegible', label: 'Illegible' },
];

const ageBadge = (iso?: string | null) => {
  if (!iso) return null;
  const ageHours = Math.floor((Date.now() - new Date(iso).getTime()) / 1000 / 60 / 60);
  if (ageHours >= 48) return { label: `${ageHours}h`, state: 'failed' as const, helper: 'Over 48h' };
  if (ageHours >= 24) return { label: `${ageHours}h`, state: 'review' as const, helper: 'Over 24h' };
  return { label: `${ageHours}h`, state: 'initiated' as const, helper: 'Fresh' };
};

export default function LicenseReviewList({ items, loading, statusText, onApprove, onReject }: LicenseReviewListProps) {
  if (loading) return <SkeletonCard />;
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleApprove = (item: DriverLicenseReview) => {
    Alert.alert('Approve license?', item.full_name ?? item.driver_id, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', style: 'default', onPress: () => onApprove(item.driver_id, notes[item.driver_id]) },
    ]);
  };

  const handleReject = (item: DriverLicenseReview, reasonKey: string, reasonLabel: string) => {
    const note = notes[item.driver_id];
    const detail = [reasonLabel, note ? `Note: ${note}` : null].filter(Boolean).join('\n');
    Alert.alert('Reject license?', detail || reasonLabel, [
      { text: 'Back', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => onReject(item.driver_id, note ? `${reasonKey}:${note}` : reasonKey) },
    ]);
  };

  return (
    <>
      {statusText && <Text style={adminStyles.status}>{statusText}</Text>}
      {items.length === 0 ? (
        <Text style={adminStyles.helperText}>No pending licenses right now. Refresh if you expect new drivers, or verify driver signup pipeline.</Text>
      ) : (
        items.map(item => {
          const age = ageBadge(item.updated_at);
          return (
            <IOSCard key={item.driver_id} padding="md" style={cardStyles.card}>
              <View style={cardStyles.headerRow}>
                <View>
                  <Text style={cardStyles.title}>{item.full_name || item.email || 'Driver'}</Text>
                  <Text style={cardStyles.meta}>Submitted: {item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}</Text>
                  <Text style={cardStyles.meta}>Driver ID: {item.driver_id}</Text>
                </View>
                <IOSStatusChip label={age ? age.helper : 'Pending'} tone={age?.state === 'failed' ? 'error' : 'info'} />
              </View>
              <Text style={cardStyles.meta}>License: {item.license_number || '—'} • {item.vehicle_type || 'vehicle'}</Text>
              <Text style={cardStyles.meta}>Email: {item.email || '—'}</Text>
              <Text style={cardStyles.meta}>Phone: {item.phone || '—'}</Text>
              {!item.payout_account_present && (
                <Text style={[cardStyles.meta, cardStyles.warn]}>Missing payout info (Instapay). Ask driver to add before going live.</Text>
              )}
              {item.license_document_url ? (
                <TouchableOpacity style={cardStyles.thumbRow} onPress={() => Linking.openURL(item.license_document_url!)}>
                  <Image source={{ uri: item.license_document_url }} style={cardStyles.thumb} />
                  <Text style={cardStyles.link}>Open document</Text>
                </TouchableOpacity>
              ) : (
                <CopyChip label="Document" value={item.license_document_url ?? undefined} />
              )}
              <View style={cardStyles.docRow}>
                {item.id_front_url ? (
                  <TouchableOpacity style={cardStyles.docLink} onPress={() => Linking.openURL(item.id_front_url!)}>
                    <Text style={cardStyles.link}>ID front</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[cardStyles.helper, cardStyles.warn]}>Missing ID front</Text>
                )}
                {item.id_back_url ? (
                  <TouchableOpacity style={cardStyles.docLink} onPress={() => Linking.openURL(item.id_back_url!)}>
                    <Text style={cardStyles.link}>ID back</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[cardStyles.helper, cardStyles.warn]}>Missing ID back</Text>
                )}
                {item.vehicle_document_url ? (
                  <TouchableOpacity style={cardStyles.docLink} onPress={() => Linking.openURL(item.vehicle_document_url!)}>
                    <Text style={cardStyles.link}>Vehicle doc</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[cardStyles.helper, cardStyles.warn]}>Missing vehicle doc</Text>
                )}
              </View>
              <Text style={cardStyles.meta}>
                {age ? `Age: ${age.label}` : 'Age: —'} • Audit: {item.doc_review_notes || 'None recorded'}
              </Text>
              <TextInput
                value={notes[item.driver_id] ?? ''}
                onChangeText={(val) => setNotes(prev => ({ ...prev, [item.driver_id]: val }))}
                placeholder="Add note (optional) before deciding"
                style={[cardStyles.input, { marginTop: 8 }]}
                multiline
              />
              <IOSTableActionRow
                title="Driver license review"
                meta={`Doc status: ${item.doc_review_status || item.license_document_status || 'pending'}`}
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
  helper: { ...iosTypography.caption, color: iosColors.secondaryText },
  docRow: { flexDirection: 'row', flexWrap: 'wrap', gap: iosSpacing.xs, marginBottom: iosSpacing.xs },
  docLink: { paddingHorizontal: iosSpacing.sm, paddingVertical: iosSpacing.xs, borderRadius: iosRadius.pill, backgroundColor: iosColors.surfaceAlt },
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
