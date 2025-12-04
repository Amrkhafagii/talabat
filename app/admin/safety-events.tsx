import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';

type SafetyEvent = {
  id: number;
  order_id: string | null;
  driver_id: string | null;
  event_type: string;
  payload: any;
  created_at: string;
};

export default function SafetyEventsAdmin() {
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Safety Events (recent)</Text>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <ScrollView>
          {events.map(ev => (
            <View key={ev.id} style={styles.card}>
              <Text style={styles.title}>{ev.event_type.replace('_', ' ')}</Text>
              <Text style={styles.meta}>Order: {ev.order_id?.slice(0, 8) || '—'} • Driver: {ev.driver_id?.slice(0, 8) || '—'}</Text>
              {ev.event_type === 'temp_check' && (
                <Text style={styles.body}>Passed: {String(ev.payload?.passed)} {ev.payload?.photo_url ? '• Photo attached' : ''}</Text>
              )}
              {ev.event_type === 'handoff_confirmation' && (
                <Text style={styles.body}>Confirmed: {String(ev.payload?.confirmed)}</Text>
              )}
              <Text style={styles.meta}>At: {new Date(ev.created_at).toLocaleString()}</Text>
              {ev.payload?.photo_url && (
                <TouchableOpacity onPress={() => {}} style={styles.linkBtn}>
                  <Text style={styles.linkText}>{ev.payload.photo_url}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  header: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#111827', marginBottom: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 12,
  },
  title: { fontFamily: 'Inter-SemiBold', color: '#111827', fontSize: 14, marginBottom: 4 },
  meta: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12 },
  body: { fontFamily: 'Inter-Regular', color: '#111827', fontSize: 13, marginVertical: 4 },
  linkBtn: { marginTop: 4 },
  linkText: { color: '#2563EB', fontFamily: 'Inter-Regular', fontSize: 12 },
});
