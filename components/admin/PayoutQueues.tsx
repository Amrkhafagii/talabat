import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { styles as adminStyles } from '@/styles/adminMetrics';
import { makeBadgeRenderer, money } from '@/utils/adminUi';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSBadge } from '@/components/ios/IOSBadge';
import { IOSPillButton } from '@/components/ios/IOSPillButton';
import { IOSSegmentedControl } from '@/components/ios/IOSSegmentedControl';
import { iosColors, iosSpacing, iosTypography, iosRadius } from '@/styles/iosTheme';
import type { RestaurantPayable, DriverPayable } from '@/utils/db/adminOps';
import AdminGrid from './AdminGrid';

export type PayoutQueuesProps = {
  restaurantPayables: RestaurantPayable[];
  driverPayables: DriverPayable[];
  loading: boolean;
  opsStatus: string | null;
  retryStatus: string | null;
  onRefresh: () => void;
  onRetryRestaurant: (orderId: string, payoutRef?: string) => void;
  onRetryDriver: (orderId: string, driverId: string, payoutRef?: string) => void;
  onProcessDue: () => void;
  focusSection?: 'restaurant' | 'driver' | 'balances';
  focusOrderId?: string | null;
  sort?: 'age' | 'amount' | 'attempts';
  onChangeSort?: (val: 'age' | 'amount' | 'attempts') => void;
};

const renderBadge = makeBadgeRenderer(adminStyles);
const statusLabel = (status?: string | null) => {
  const text = (status ?? 'pending').replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default function PayoutQueues({
  restaurantPayables,
  driverPayables,
  loading,
  opsStatus,
  retryStatus,
  onRefresh,
  onRetryRestaurant,
  onRetryDriver,
  onProcessDue,
  focusSection,
  focusOrderId,
  sort = 'age',
  onChangeSort,
}: PayoutQueuesProps) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const highlightOrderId = focusOrderId ?? null;
  const sorters = {
    age: (a: any, b: any) =>
      new Date(b.restaurant_payout_next_retry_at ?? b.driver_payout_next_retry_at ?? b.created_at ?? 0).getTime() -
      new Date(a.restaurant_payout_next_retry_at ?? a.driver_payout_next_retry_at ?? a.created_at ?? 0).getTime(),
    amount: (a: any, b: any) =>
      Number(b.restaurant_net ?? b.delivery_fee ?? b.tip_amount ?? 0) - Number(a.restaurant_net ?? a.delivery_fee ?? a.tip_amount ?? 0),
    attempts: (a: any, b: any) => Number(b.payout_attempts ?? 0) - Number(a.payout_attempts ?? 0),
  } as const;
  const sorter = sorters[sort] || sorters.age;
  const sortedRestaurants = [...restaurantPayables].sort(sorter);
  const sortedDrivers = [...driverPayables].sort(sorter);
  const groupByStatus = (items: any[]) =>
    items.reduce<Record<string, any[]>>((acc, item) => {
      const status = (item.restaurant_payout_status || item.driver_payout_status || 'pending') as string;
      acc[status] = acc[status] || [];
      acc[status].push(item);
      return acc;
    }, {});
  const restGroups = groupByStatus(sortedRestaurants);
  const driverGroups = groupByStatus(sortedDrivers);
  const renderGrouped = (groups: Record<string, any[]>, type: 'restaurant' | 'driver') =>
    Object.entries(groups).map(([status, items]) => (
      <IOSCard key={`${type}-${status}`} padding="md" style={{ marginBottom: iosSpacing.sm }}>
        <View style={iosStyles.groupHeader}>
          <Text style={iosStyles.meta}>{statusLabel(status)}</Text>
          <IOSBadge label={`${items.length} items`} tone="neutral" />
        </View>
        {items.map((item) => {
          const isFocused = highlightOrderId && highlightOrderId === item.order_id;
          const lastError = type === 'restaurant' ? item.restaurant_payout_last_error : item.driver_payout_last_error;
          const nextRetry = type === 'restaurant' ? item.restaurant_payout_next_retry_at : item.driver_payout_next_retry_at;
          const payoutStatus = type === 'restaurant' ? item.restaurant_payout_status : item.driver_payout_status;
          return (
            <View key={`${item.order_id}-${type === 'driver' ? item.driver_id : 'r'}`} style={[iosStyles.rowCard, isFocused && iosStyles.rowFocused]}>
              <View style={iosStyles.rowHeader}>
                <Text style={iosStyles.rowTitle}>Order {item.order_id.slice(-6).toUpperCase()}</Text>
                <IOSBadge label={statusLabel(payoutStatus)} tone="info" />
              </View>
              <Text style={iosStyles.meta}>Next retry: {nextRetry ?? '—'}</Text>
              {lastError ? <Text style={[iosStyles.meta, iosStyles.warn]}>Last error: {lastError}</Text> : null}
              <View style={iosStyles.actionRow}>
                <IOSPillButton
                  label={busy === item.order_id ? 'Retrying…' : 'Retry'}
                  variant="ghost"
                  size="sm"
                  onPress={async () => {
                    setBusy(item.order_id);
                    if (type === 'restaurant') await onRetryRestaurant(item.order_id, item.payout_ref ?? undefined);
                    else await onRetryDriver(item.order_id, item.driver_id!, item.payout_ref ?? undefined);
                    setBusy(null);
                  }}
                  disabled={!!busy}
                />
                <IOSPillButton label="Open order" variant="ghost" size="sm" onPress={() => onRefresh()} />
              </View>
            </View>
          );
        })}
      </IOSCard>
    ));
  const renderRestaurant = () => (
    <View style={adminStyles.sectionCard} onLayout={undefined}>
      <Text style={adminStyles.sectionTitle}>Restaurant payables (pending)</Text>
      <TouchableOpacity style={[adminStyles.button, adminStyles.outlineButton, { marginBottom: 10 }]} onPress={onRefresh} disabled={loading}>
        <Text style={adminStyles.outlineButtonText}>{loading ? 'Refreshing…' : 'Refresh payouts'}</Text>
      </TouchableOpacity>
      {loading ? (
        <SkeletonCard />
      ) : sortedRestaurants.length === 0 ? (
        <Text style={adminStyles.helperText}>No pending restaurant payouts.</Text>
      ) : (
        renderGrouped(restGroups, 'restaurant')
      )}
    </View>
  );

  const renderDriver = () => (
    <View style={adminStyles.sectionCard}>
      <Text style={adminStyles.sectionTitle}>Driver payables (pending)</Text>
      {loading ? (
        <SkeletonCard />
      ) : sortedDrivers.length === 0 ? (
        <Text style={adminStyles.helperText}>No pending driver payouts.</Text>
      ) : (
        renderGrouped(driverGroups, 'driver')
      )}
    </View>
  );

  const showDriverFirst = focusSection === 'driver';

  return (
    <>
      <View style={iosStyles.sortRow}>
        <Text style={iosStyles.meta}>Sort by</Text>
        <IOSSegmentedControl
          segments={[
            { key: 'age', label: 'Age' },
            { key: 'amount', label: 'Amount' },
            { key: 'attempts', label: 'Attempts' },
          ]}
          value={sort}
          onChange={(k) => onChangeSort && onChangeSort(k)}
          style={{ marginTop: iosSpacing.xs }}
        />
      </View>
      {showDriverFirst ? renderDriver() : renderRestaurant()}
      {showDriverFirst ? renderRestaurant() : renderDriver()}
      {opsStatus && <Text style={iosStyles.status}>{opsStatus}</Text>}
      <View style={iosStyles.actionRow}>
        <IOSPillButton onPress={onProcessDue} label={busy ? 'Processing…' : 'Process due payout retries'} variant="ghost" disabled={!!busy} />
        <IOSPillButton onPress={onRefresh} label={loading ? 'Refreshing…' : 'Bulk refresh'} variant="ghost" disabled={loading} />
      </View>
      {retryStatus && <Text style={iosStyles.status}>{retryStatus}</Text>}
    </>
  );
}

const SkeletonCard = () => (
  <IOSCard padding="md" style={{ opacity: 0.6 }}>
    <View style={{ height: 12, backgroundColor: iosColors.surfaceAlt, borderRadius: 6, marginBottom: 8 }} />
    <View style={{ height: 10, backgroundColor: iosColors.surfaceAlt, borderRadius: 6, marginBottom: 6, width: '80%' }} />
    <View style={{ height: 10, backgroundColor: iosColors.surfaceAlt, borderRadius: 6, marginBottom: 6, width: '60%' }} />
    <View style={{ height: 10, backgroundColor: iosColors.surfaceAlt, borderRadius: 6, marginBottom: 6, width: '50%' }} />
  </IOSCard>
);

const iosStyles = StyleSheet.create({
  row: { paddingHorizontal: iosSpacing.md, paddingVertical: iosSpacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText },
  warn: { color: iosColors.destructive },
  filterChipRow: { flexDirection: 'row', gap: iosSpacing.xs },
  filterChip: { paddingHorizontal: iosSpacing.sm, paddingVertical: iosSpacing.xs, borderRadius: iosSpacing.xs, backgroundColor: '#E5E5EA' },
  filterChipActive: { backgroundColor: iosColors.primary },
  filterChipText: { ...iosTypography.caption },
  filterChipTextActive: { color: '#FFFFFF' },
  status: { ...iosTypography.caption, color: iosColors.secondaryText, marginTop: iosSpacing.xs },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: iosSpacing.xs },
  rowCard: { paddingVertical: iosSpacing.xs, borderBottomWidth: 1, borderBottomColor: iosColors.separator, gap: 2 },
  rowFocused: { borderColor: iosColors.primary, borderWidth: 1, borderRadius: iosRadius.md, paddingHorizontal: iosSpacing.xs },
  rowTitle: { ...iosTypography.subhead },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: iosSpacing.xs, marginTop: iosSpacing.xs },
  sortRow: { marginBottom: iosSpacing.sm },
});
