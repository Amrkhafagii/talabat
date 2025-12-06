import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import type { TrustedRolloutConfig } from '@/utils/db/config';

type Props = {
  config: TrustedRolloutConfig | null;
  configLoading: boolean;
  subsText: string;
  rerouteText: string;
  savingConfig: boolean;
  refreshingMetrics: boolean;
  status: string | null;
  onSubsChange: (v: string) => void;
  onRerouteChange: (v: string) => void;
  onObserveToggle: (v: boolean) => void;
  onKillSwitchChange: (key: 'killSwitchOnTime' | 'killSwitchRerouteRate' | 'killSwitchCreditBudget', val: number | undefined) => void;
  onSave: () => void;
  onApplyKillSwitch: () => void;
  onRefreshMetrics: () => void;
};

export default function RolloutConfig({
  config,
  configLoading,
  subsText,
  rerouteText,
  savingConfig,
  refreshingMetrics,
  status,
  onSubsChange,
  onRerouteChange,
  onObserveToggle,
  onKillSwitchChange,
  onSave,
  onApplyKillSwitch,
  onRefreshMetrics,
}: Props) {
  return (
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
              onValueChange={onObserveToggle}
            />
          </View>
          <Text style={styles.inputLabel}>Substitutions enabled for (comma IDs)</Text>
          <TextInput
            style={styles.input}
            placeholder="city1, city2, restaurant-ids…"
            value={subsText}
            onChangeText={onSubsChange}
            autoCapitalize="none"
          />
          <Text style={styles.inputLabel}>Reroute enabled for (comma IDs)</Text>
          <TextInput
            style={styles.input}
            placeholder="city1, city2, restaurant-ids…"
            value={rerouteText}
            onChangeText={onRerouteChange}
            autoCapitalize="none"
          />
          <Text style={styles.inputLabel}>Kill switch: on-time % threshold</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(config.killSwitchOnTime ?? '')}
            onChangeText={v => onKillSwitchChange('killSwitchOnTime', Number(v) || undefined)}
          />
          <Text style={styles.inputLabel}>Kill switch: reroute rate cap</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(config.killSwitchRerouteRate ?? '')}
            onChangeText={v => onKillSwitchChange('killSwitchRerouteRate', Number(v) || undefined)}
          />
          <Text style={styles.inputLabel}>Kill switch: credit budget per 100 orders</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={String(config.killSwitchCreditBudget ?? '')}
            onChangeText={v => onKillSwitchChange('killSwitchCreditBudget', Number(v) || undefined)}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={onSave}
              disabled={savingConfig}
              style={[styles.button, styles.buttonPrimary, { marginRight: 6 }]}
            >
              <Text style={styles.buttonText}>{savingConfig ? 'Saving…' : 'Save rollout config'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onApplyKillSwitch}
              style={[styles.button, styles.buttonGhost, { marginLeft: 6 }]}
            >
              <Text style={styles.secondaryButtonText}>Apply kill switch</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onRefreshMetrics} style={[styles.button, styles.outlineButton]}>
            <Text style={styles.outlineButtonText}>{refreshingMetrics ? 'Refreshing…' : 'Refresh metrics now'}</Text>
          </TouchableOpacity>
          {status && <Text style={styles.status}>{status}</Text>}
        </>
      )}
    </View>
  );
}
