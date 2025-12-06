import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import * as Linking from 'expo-linking';
import CopyChip from '@/app/components/CopyChip';
import { styles } from '@/styles/adminMetrics';
import { makeBadgeRenderer } from '@/utils/adminUi';
import type { MenuPhotoReview } from '@/utils/db/adminOps';

export type PhotoReviewListProps = {
  items: MenuPhotoReview[];
  loading: boolean;
  statusText: string | null;
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, reason?: string) => void;
};

const renderBadge = makeBadgeRenderer(styles);
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
      {statusText && <Text style={styles.status}>{statusText}</Text>}
      {items.length === 0 ? (
        <Text style={styles.helperText}>No pending menu photos right now. Refresh or check menu upload pipeline if you expect new ones.</Text>
      ) : (
        items.map(item => {
          const age = ageBadge(item.updated_at);
          return (
            <View key={item.menu_item_id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.metaRow}>Restaurant: {item.restaurant_name}</Text>
                  <Text style={styles.metaRow}>Updated: {item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}</Text>
                  {!item.restaurant_has_payout && (
                    <Text style={[styles.metaRow, styles.warningText]}>Restaurant payout info missing; flag before approval.</Text>
                  )}
                </View>
                <View style={styles.badgeRow}>
                  {renderBadge('Pending', 'review')}
                  {age && renderBadge(age.label, age.state)}
                </View>
              </View>
              {item.image ? (
                <TouchableOpacity style={styles.thumbRow} onPress={() => Linking.openURL(item.image)}>
                  <Image source={{ uri: item.image }} style={styles.thumb} />
                  <Text style={styles.linkText}>Open photo</Text>
                </TouchableOpacity>
              ) : (
                <CopyChip label="Photo" value={item.image} />
              )}
              {item.photo_approval_notes ? (
                <Text style={[styles.row, styles.warningText]}>Notes: {item.photo_approval_notes}</Text>
              ) : null}
              <Text style={styles.metaRow}>{age ? `Age: ${age.label}` : 'Age: —'} • Audit: {item.photo_approval_notes || 'None recorded'}</Text>
              <Text style={styles.metaRow}>Reason ideas: blurry / brand violation / missing items</Text>
              <TextInput
                value={notes[item.menu_item_id] ?? ''}
                onChangeText={(val) => setNotes(prev => ({ ...prev, [item.menu_item_id]: val }))}
                placeholder="Add note (optional) before deciding"
                style={[styles.input, { marginTop: 8 }]}
                multiline
              />
              <View style={styles.buttonRow}>
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
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={() => handleApprove(item)}
                >
                  <Text style={styles.buttonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
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
