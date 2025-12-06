import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '@/utils/supabase';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminGate } from '@/hooks/useAdminGate';
import { IOSCard } from '@/components/ios/IOSCard';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSBadge } from '@/components/ios/IOSBadge';

type SafetyEvent = {
  id: number;
  order_id: string | null;
  driver_id: string | null;
  event_type: string;
  payload: any;
  created_at: string;
};

export default function SafetyEventsAdmin() {
  const { allowed, loading: gateLoading, signOut } = useAdminGate();
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_events')
        .select('*')
        .in('event_type', ['temp_check', 'handoff_confirmation'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) setEvents(data as SafetyEvent[]);
      setLoading(false);
    };
    load();
  }, []);

  if (gateLoading || !allowed) return null;

  return (
    <AdminShell title="Safety Events" onSignOut={signOut} headerVariant="ios">
      <Text style={styles.header}>Recent safety checks</Text>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={iosColors.primary} />
        </View>
      ) : (
        <ScrollView>
          {events.map(ev => (
            <IOSCard key={ev.id} padding="md" style={styles.card}>
              <View style={styles.rowHeader}>
                <Text style={styles.title}>{ev.event_type.replace('_', ' ')}</Text>
                <IOSBadge label={new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tone="neutral" />
              </View>
              <Text style={styles.meta}>Order: {ev.order_id?.slice(-6).toUpperCase() || '—'} • Driver: {ev.driver_id?.slice(-6).toUpperCase() || '—'}</Text>
              {ev.event_type === 'temp_check' && (
                <Text style={styles.body}>Passed: {String(ev.payload?.passed)} {ev.payload?.photo_url ? '• Photo attached' : ''}</Text>
              )}
              {ev.event_type === 'handoff_confirmation' && (
                <Text style={styles.body}>Confirmed: {String(ev.payload?.confirmed)}</Text>
              )}
              {ev.payload?.photo_url && (
                <TouchableOpacity onPress={() => {}} style={styles.linkBtn}>
                  <Text style={styles.linkText}>Open photo</Text>
                </TouchableOpacity>
              )}
            </IOSCard>
          ))}
        </ScrollView>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  header: { ...iosTypography.subhead, color: iosColors.secondaryText, marginBottom: iosSpacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: iosSpacing.sm, borderRadius: iosRadius.lg },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...iosTypography.subhead },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText },
  body: { ...iosTypography.body, color: iosColors.text, marginVertical: iosSpacing.xs },
  linkBtn: { marginTop: 4 },
  linkText: { color: iosColors.primary, ...iosTypography.caption },
});
