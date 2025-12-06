import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import CopyChip from '@/app/components/CopyChip';
import { styles } from '@/styles/adminMetrics';
import { makeBadgeRenderer, money, payoutBadgeState } from '@/utils/adminUi';
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

const renderBadge = makeBadgeRenderer(styles);
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
      <View key={`${type}-${status}`} style={[styles.tableCard, { marginBottom: 12 }]}>
        <View style={[styles.tableRow, styles.tableRowMuted]}>
          <Text style={styles.metaRow}>{statusLabel(status)}</Text>
          <Text style={styles.metaRow}>{items.length} items</Text>
        </View>
        {items.map((item) => {
          const isFocused = highlightOrderId && highlightOrderId === item.order_id;
          const lastError = type === 'restaurant' ? item.restaurant_payout_last_error : item.driver_payout_last_error;
          const nextRetry = type === 'restaurant' ? item.restaurant_payout_next_retry_at : item.driver_payout_next_retry_at;
          const payoutStatus = type === 'restaurant' ? item.restaurant_payout_status : item.driver_payout_status;
          return (
            <View key={`${item.order_id}-${type === 'driver' ? item.driver_id : 'r'}`} style={[styles.tableRow, isFocused && styles.cardActive]}>
              <Text style={styles.row}>Order {item.order_id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.metaRow}>Status: {statusLabel(payoutStatus)}</Text>
              <Text style={styles.metaRow}>Next retry: {nextRetry ?? '—'}</Text>
              {lastError ? <Text style={[styles.metaRow, styles.warningText]}>Last error: {lastError}</Text> : null}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.outlineButton, { minWidth: 140 }]}
                  onPress={async () => {
                    setBusy(item.order_id);
                    if (type === 'restaurant') await onRetryRestaurant(item.order_id, item.payout_ref ?? undefined);
                    else await onRetryDriver(item.order_id, item.driver_id!, item.payout_ref ?? undefined);
                    setBusy(null);
                  }}
                  disabled={!!busy}
                >
                  <Text style={styles.outlineButtonText}>{busy === item.order_id ? 'Retrying…' : 'Retry'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkRow} onPress={() => onRefresh()}>
                  <Text style={styles.linkText}>Open order</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    ));
  const renderRestaurant = () => (
    <View style={styles.sectionCard} onLayout={undefined}>
      <Text style={styles.sectionTitle}>Restaurant payables (pending)</Text>
      <TouchableOpacity style={[styles.button, styles.outlineButton, { marginBottom: 10 }]} onPress={onRefresh} disabled={loading}>
        <Text style={styles.outlineButtonText}>{loading ? 'Refreshing…' : 'Refresh payouts'}</Text>
      </TouchableOpacity>
      {loading ? (
        <SkeletonCard />
      ) : sortedRestaurants.length === 0 ? (
        <Text style={styles.helperText}>No pending restaurant payouts.</Text>
      ) : (
        renderGrouped(restGroups, 'restaurant')
      )}
    </View>
  );

  const renderDriver = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Driver payables (pending)</Text>
      {loading ? (
        <SkeletonCard />
      ) : sortedDrivers.length === 0 ? (
        <Text style={styles.helperText}>No pending driver payouts.</Text>
      ) : (
        renderGrouped(driverGroups, 'driver')
      )}
    </View>
  );

  const showDriverFirst = focusSection === 'driver';

  return (
    <>
      <View style={styles.sortRow}>
        <Text style={styles.metaRow}>Sort by</Text>
        <View style={styles.filterChipRow}>
          {(['age', 'amount', 'attempts'] as const).map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.filterChip, sort === k && styles.filterChipActive]}
              onPress={() => onChangeSort && onChangeSort(k)}
            >
              <Text style={[styles.filterChipText, sort === k && styles.filterChipTextActive]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {showDriverFirst ? renderDriver() : renderRestaurant()}
      {showDriverFirst ? renderRestaurant() : renderDriver()}
      {opsStatus && <Text style={styles.status}>{opsStatus}</Text>}
      <View style={[styles.buttonRow, { marginTop: 10 }]}>
        <TouchableOpacity onPress={onProcessDue} style={[styles.button, styles.outlineButton]} disabled={!!busy}>
          <Text style={styles.outlineButtonText}>{busy ? 'Processing…' : 'Process due payout retries'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRefresh} style={[styles.button, styles.outlineButton]} disabled={loading}>
          <Text style={styles.outlineButtonText}>{loading ? 'Refreshing…' : 'Bulk refresh'}</Text>
        </TouchableOpacity>
      </View>
      {retryStatus && <Text style={styles.status}>{retryStatus}</Text>}
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
