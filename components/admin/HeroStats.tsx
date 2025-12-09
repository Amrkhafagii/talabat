import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '@/styles/adminMetrics';
import { formatCurrency } from '@/utils/formatters';

export type HeroStatsProps = {
  approvalsCount: number;
  payoutsCount: number;
  platformNet?: number | null;
  refreshing: boolean;
  onRefreshAll: () => void;
  onPressSection: (key: string) => void;
};

export default function HeroStats({ approvalsCount, payoutsCount, platformNet = 0, refreshing, onRefreshAll, onPressSection }: HeroStatsProps) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <Text style={styles.heroTitle}>Ops health</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefreshAll} disabled={refreshing}>
          <Text style={styles.refreshText}>{refreshing ? 'Refreshing…' : 'Refresh all'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsGrid}>
        {[
          { key: 'payments', label: 'Approvals pending', value: approvalsCount },
          { key: 'payouts', label: 'Payouts pending', value: payoutsCount },
          { key: 'net', label: 'Platform net (last day)', value: platformNet ?? 0, money: true },
        ].map(card => (
          <TouchableOpacity key={card.key} style={styles.statCard} onPress={() => onPressSection(card.key)}>
            <Text style={styles.statLabel}>{card.label}</Text>
            <Text style={styles.statValue}>{card.money ? formatCurrency(Number(card.value)) : card.value}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.heroHelper}>Counts show full queues (ignores filters). Tap a tile to jump to that section.</Text>
    </View>
  );
}
