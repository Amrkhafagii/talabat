import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Props = {
  driverName?: string | null;
  orderIdLabel?: string;
  isOnline: boolean;
  onToggleOnline: () => void;
  onRefresh: () => void;
  refreshing: boolean;
};

export function DashboardHeader({ driverName, orderIdLabel, isOnline, onToggleOnline, onRefresh, refreshing }: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.statusPill} onPress={onToggleOnline}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.colors.success : theme.colors.status.error }]} />
          <Text style={styles.statusLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.driverName}>{driverName || 'Driver'}</Text>
          <Text style={styles.subtle}>Order #{orderIdLabel || '—'}</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <RealtimeIndicator />
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
          <Icon name='RefreshCw' size='md' color={theme.colors.textMuted} style={refreshing ? styles.spinning : undefined} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (
  theme: ReturnType<typeof useRestaurantTheme>,
) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    statusLabel: { ...theme.typography.caption, color: theme.colors.accent },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.md,
    },
    headerText: {
      flex: 1,
    },
    driverName: {
      ...theme.typography.titleM,
      color: theme.colors.text,
    },
    subtle: { ...theme.typography.caption, color: theme.colors.textMuted },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    refreshButton: {
      padding: theme.spacing.xs,
    },
    spinning: {
      transform: [{ rotate: '180deg' }],
    },
  });
