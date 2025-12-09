import React from 'react';
import { View, Text } from 'react-native';
import { styles as adminStyles } from '@/styles/adminMetrics';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSBadge } from '@/components/ios/IOSBadge';
import { iosColors, iosSpacing, iosTypography, iosRadius } from '@/styles/iosTheme';
import type { DriverPayable, RestaurantPayable } from '@/utils/db/admin';

type Props = {
  restaurantPayables: RestaurantPayable[];
  driverPayables: DriverPayable[];
  loading?: boolean;
  useIos?: boolean;
};

export function PayoutBacklog({ restaurantPayables, driverPayables, loading = false, useIos = false }: Props) {
  if (loading) {
    return useIos ? (
      <IOSCard padding="md" style={{ marginBottom: iosSpacing.sm }}>
        <Text style={iosTypography.headline}>Payout backlog</Text>
        <Text style={iosTypography.caption}>Loading payouts…</Text>
      </IOSCard>
    ) : (
      <View style={adminStyles.sectionCard}>
        <Text style={adminStyles.sectionTitle}>Payout backlog</Text>
        <Text style={adminStyles.metaRow}>Loading payouts…</Text>
      </View>
    );
  }

  const restSample = restaurantPayables.slice(0, 3);
  const driverSample = driverPayables.slice(0, 3);

  if (useIos) {
    return (
      <IOSCard padding="md" style={{ marginBottom: iosSpacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: iosSpacing.xs }}>
          <Text style={iosTypography.headline}>Payout backlog</Text>
          <IOSBadge label={`Restaurants: ${restaurantPayables.length} • Drivers: ${driverPayables.length}`} tone="neutral" />
        </View>
        <Text style={iosTypography.caption}>Top items (most recent)</Text>
        {restSample.map(p => (
          <View key={p.order_id} style={iosStyles.card}>
            <Text style={iosStyles.title}>{p.restaurant_name || p.restaurant_id}</Text>
            <Text style={iosStyles.meta}>Order: {p.order_id}</Text>
            <Text style={iosStyles.row}>Amount due: ${(Number(p.restaurant_net ?? 0) + Number(p.tip_amount ?? 0)).toFixed(2)}</Text>
            {p.restaurant_payout_last_error && (
              <Text style={[iosStyles.row, iosStyles.warn]}>Last error: {p.restaurant_payout_last_error}</Text>
            )}
          </View>
        ))}
        {driverSample.map(p => (
          <View key={p.order_id} style={iosStyles.card}>
            <Text style={iosStyles.title}>{p.driver_name || p.driver_id}</Text>
            <Text style={iosStyles.meta}>Order: {p.order_id}</Text>
            <Text style={iosStyles.row}>Amount due: ${Number(p.driver_payable ?? 0).toFixed(2)}</Text>
            {p.driver_payout_last_error && (
              <Text style={[iosStyles.row, iosStyles.warn]}>Last error: {p.driver_payout_last_error}</Text>
            )}
          </View>
        ))}
        {restSample.length === 0 && driverSample.length === 0 && (
          <Text style={iosStyles.row}>No payouts pending.</Text>
        )}
      </IOSCard>
    );
  }

  return (
    <View style={adminStyles.sectionCard}>
      <View style={adminStyles.cardHeaderRow}>
        <Text style={adminStyles.sectionTitle}>Payout backlog</Text>
        <Text style={adminStyles.metaRow}>
          Restaurants: {restaurantPayables.length} • Drivers: {driverPayables.length}
        </Text>
      </View>
      <Text style={adminStyles.metaRow}>Top items (most recent)</Text>
      {restSample.map(p => (
        <View key={p.order_id} style={adminStyles.card}>
          <Text style={adminStyles.title}>{p.restaurant_name || p.restaurant_id}</Text>
          <Text style={adminStyles.metaRow}>Order: {p.order_id}</Text>
          <Text style={adminStyles.row}>
            Amount due: ${(Number(p.restaurant_net ?? 0) + Number(p.tip_amount ?? 0)).toFixed(2)}
          </Text>
          {p.restaurant_payout_last_error && (
            <Text style={[adminStyles.row, adminStyles.warningText]}>Last error: {p.restaurant_payout_last_error}</Text>
          )}
        </View>
      ))}
      {driverSample.map(p => (
        <View key={p.order_id} style={adminStyles.card}>
          <Text style={adminStyles.title}>{p.driver_name || p.driver_id}</Text>
          <Text style={adminStyles.metaRow}>Order: {p.order_id}</Text>
          <Text style={adminStyles.row}>Amount due: ${Number(p.driver_payable ?? 0).toFixed(2)}</Text>
          {p.driver_payout_last_error && (
            <Text style={[adminStyles.row, adminStyles.warningText]}>Last error: {p.driver_payout_last_error}</Text>
          )}
        </View>
      ))}
      {restSample.length === 0 && driverSample.length === 0 && (
        <Text style={adminStyles.row}>No payouts pending.</Text>
      )}
    </View>
  );
}

export default PayoutBacklog;

const iosStyles = {
  card: {
    borderWidth: 1,
    borderColor: iosColors.separator,
    borderRadius: iosRadius.md,
    padding: iosSpacing.sm,
    marginTop: iosSpacing.xs,
  },
  title: { ...iosTypography.subhead },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText },
  row: { ...iosTypography.caption },
  warn: { color: iosColors.destructive },
};
