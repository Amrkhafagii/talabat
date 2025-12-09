import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import StatCard from '@/components/common/StatCard';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Stats = {
  todayEarnings: number;
  completedDeliveries: number;
  avgDeliveryTime: number;
  rating: number;
};

type Props = {
  stats: Stats;
  paddingHorizontal: number;
};

export function DashboardStatsGrid({ stats, paddingHorizontal }: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme, paddingHorizontal), [theme, paddingHorizontal]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Today</Text>
      <View style={styles.grid}>
        <StatCard icon="DollarSign" value={`$${stats.todayEarnings.toFixed(2)}`} label="Earnings" />
        <StatCard icon="CheckCircle" value={stats.completedDeliveries} label="Deliveries" />
        <StatCard icon="Clock" value={`${stats.avgDeliveryTime}m`} label="Avg Time" />
        <StatCard icon="Truck" value={stats.rating.toFixed(1)} label="Rating" />
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, paddingHorizontal: number) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      ...theme.typography.titleM,
      color: theme.colors.text,
      paddingHorizontal,
      marginBottom: theme.spacing.md,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: paddingHorizontal - theme.spacing.sm,
      gap: theme.spacing.md,
    },
  });
