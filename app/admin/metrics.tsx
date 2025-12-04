import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTrustedArrivalMetrics, runKillSwitch, runPopulateMetrics, getTrustedRolloutConfig, upsertTrustedRolloutConfig } from '@/utils/database';
import type { TrustedArrivalMetrics } from '@/utils/db/metrics';
import type { TrustedRolloutConfig } from '@/utils/db/config';

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<TrustedArrivalMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [config, setConfig] = useState<TrustedRolloutConfig | null>(null);
  const [subsText, setSubsText] = useState('');
  const [rerouteText, setRerouteText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [refreshingMetrics, setRefreshingMetrics] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getTrustedArrivalMetrics(7);
      setMetrics(data);
      setLoading(false);
      const cfg = await getTrustedRolloutConfig();
      setConfig(cfg);
      setSubsText(cfg.substitutionsEnabledFor.join(','));
      setRerouteText(cfg.rerouteEnabledFor.join(','));
      setConfigLoading(false);
    };
    load();
  }, []);

  const parseList = (val: string) => val.split(',').map(v => v.trim()).filter(Boolean);

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    setStatus(null);
    const ok = await upsertTrustedRolloutConfig({
      ...config,
      substitutionsEnabledFor: parseList(subsText),
      rerouteEnabledFor: parseList(rerouteText),
    });
    setSavingConfig(false);
    setStatus(ok ? 'Rollout config saved.' : 'Failed to save config.');
  };

  const handleApplyKillSwitch = async () => {
    setStatus(null);
    const ok = await runKillSwitch();
    setStatus(ok ? 'Kill switch applied (where thresholds breached).' : 'Failed to apply kill switch.');
  };

  const handleRefreshMetrics = async () => {
    setRefreshingMetrics(true);
    await runPopulateMetrics();
    const data = await getTrustedArrivalMetrics(7);
    setMetrics(data);
    setRefreshingMetrics(false);
    setStatus('Metrics refreshed.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.header}>Trusted Arrival Ops</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rollout flags</Text>
          {configLoading || !config ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text style={styles.row}>Loading config…</Text>
            </View>
          ) : (
            <>
              <View style={styles.switchRow}>
                <Text style={styles.row}>Observe only</Text>
                <Switch
                  value={config.observeOnly}
                  onValueChange={val => setConfig({ ...config, observeOnly: val })}
                />
              </View>
              <Text style={styles.inputLabel}>Substitutions enabled for (comma IDs)</Text>
              <TextInput
                style={styles.input}
                placeholder="city1, city2, restaurant-ids…"
                value={subsText}
                onChangeText={setSubsText}
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Reroute enabled for (comma IDs)</Text>
              <TextInput
                style={styles.input}
                placeholder="city1, city2, restaurant-ids…"
                value={rerouteText}
                onChangeText={setRerouteText}
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Kill switch: on-time % threshold</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(config.killSwitchOnTime ?? '')}
                onChangeText={v => setConfig({ ...config, killSwitchOnTime: Number(v) || undefined })}
              />
              <Text style={styles.inputLabel}>Kill switch: reroute rate cap</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(config.killSwitchRerouteRate ?? '')}
                onChangeText={v => setConfig({ ...config, killSwitchRerouteRate: Number(v) || undefined })}
              />
              <Text style={styles.inputLabel}>Kill switch: credit budget per 100 orders</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(config.killSwitchCreditBudget ?? '')}
                onChangeText={v => setConfig({ ...config, killSwitchCreditBudget: Number(v) || undefined })}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  onPress={handleSaveConfig}
                  disabled={savingConfig}
                  style={[styles.button, styles.buttonLeft]}
                >
                  <Text style={styles.buttonText}>{savingConfig ? 'Saving…' : 'Save rollout config'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApplyKillSwitch}
                  style={[styles.button, styles.secondaryButton, styles.buttonRight]}
                >
                  <Text style={styles.secondaryButtonText}>Apply kill switch</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleRefreshMetrics} style={[styles.button, styles.outlineButton]}>
                <Text style={styles.outlineButtonText}>{refreshingMetrics ? 'Refreshing…' : 'Refresh metrics now'}</Text>
              </TouchableOpacity>
              {status && <Text style={styles.status}>{status}</Text>}
            </>
          )}
        </View>

        <Text style={styles.header}>Trusted Arrival Metrics (7d)</Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : (
          metrics.map((m, idx) => (
            <View key={`${m.restaurant_id}-${m.metric_date}-${idx}`} style={styles.card}>
              <Text style={styles.title}>Restaurant {m.restaurant_id}</Text>
              <Text style={styles.subtitle}>{m.metric_date}</Text>
              <Text style={styles.row}>On-time %: {m.on_time_pct ?? '—'}</Text>
              <Text style={styles.row}>Reroute rate: {m.reroute_rate ?? '—'}</Text>
              <Text style={styles.row}>Substitution acceptance: {m.substitution_acceptance ?? '—'}</Text>
              <Text style={styles.row}>Credit cost: {m.credit_cost ?? 0}</Text>
              <Text style={styles.row}>Affected orders: {m.affected_orders ?? 0}</Text>
              <Text style={styles.row}>CSAT affected: {m.csat_affected ?? '—'}</Text>
              <Text style={styles.row}>CSAT baseline: {m.csat_baseline ?? '—'}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  header: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#111827', marginBottom: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  title: { fontFamily: 'Inter-SemiBold', color: '#111827' },
  subtitle: { fontFamily: 'Inter-Regular', color: '#6B7280', marginBottom: 6 },
  row: { fontFamily: 'Inter-Regular', color: '#111827', fontSize: 13, marginBottom: 2 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  sectionTitle: { fontFamily: 'Inter-SemiBold', color: '#111827', fontSize: 15, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  inputLabel: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginTop: 4,
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  button: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  secondaryButton: { backgroundColor: '#FFEDD5' },
  secondaryButtonText: { color: '#C2410C', fontFamily: 'Inter-SemiBold' },
  buttonLeft: { marginRight: 6 },
  buttonRight: { marginLeft: 6 },
  outlineButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#111827',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineButtonText: { color: '#111827', fontFamily: 'Inter-SemiBold' },
  status: { marginTop: 8, color: '#16A34A', fontFamily: 'Inter-Regular', fontSize: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
});
