import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import PaymentReviewList from '@/components/admin/PaymentReviewList';
import LicenseReviewList from '@/components/admin/LicenseReviewList';
import PhotoReviewList from '@/components/admin/PhotoReviewList';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminState } from '@/components/admin/AdminState';
import { useAdminMetricsCoordinator } from '@/hooks/useAdminMetricsCoordinator';
import { useAdminGate } from '@/hooks/useAdminGate';
import { styles } from '@/styles/adminMetrics';
import ReviewFilters from '@/components/admin/ReviewFilters';
import AdminGrid from '@/components/admin/AdminGrid';
import { AdminToast } from '@/components/admin/AdminToast';

type SectionProps = ReturnType<typeof useAdminMetricsCoordinator> & { initialQuery?: string };

export default function AdminReviews() {
  const params = useLocalSearchParams<{ tab?: string; q?: string }>();
  const { allowed, loading: gateLoading, signOut } = useAdminGate();
  const vm = useAdminMetricsCoordinator();
  const sharedQuery = typeof params.q === 'string' ? params.q : '';
  const tab = typeof params.tab === 'string' ? params.tab : 'payments';
  const [activeTab, setActiveTab] = useState<'payments' | 'licenses' | 'photos'>(tab as any);

  useEffect(() => {
    if (tab === 'licenses' || tab === 'photos' || tab === 'payments') setActiveTab(tab);
  }, [tab]);

  if (gateLoading || !allowed) return null;

  return (
    <AdminShell title="Reviews" onSignOut={signOut}>
      <AdminToast message={vm.status} tone="info" />
      <TabStrip
        active={activeTab}
        onChange={setActiveTab}
        counts={{
          payments: vm.reviewQueue.length,
          licenses: vm.licenseQueue.length,
          photos: vm.photoQueue.length,
        }}
        risks={{
          payments: vm.reviewQueue.some(vm.mismatch),
          licenses: vm.licenseQueue.some((l) => !l.payout_account_present),
          photos: vm.photoQueue.some((p) => !p.restaurant_has_payout),
        }}
      />
      {activeTab === 'payments' && <PaymentsSection {...vm} initialQuery={!tab || tab === 'payments' ? sharedQuery : ''} />}
      {activeTab === 'licenses' && (
        <LicenseSection {...vm} initialQuery={tab === 'licenses' ? sharedQuery : ''} />
      )}
      {activeTab === 'photos' && <PhotoSection {...vm} initialQuery={tab === 'photos' ? sharedQuery : ''} />}
    </AdminShell>
  );
}

function TabStrip({
  active,
  onChange,
  counts,
  risks,
}: {
  active: 'payments' | 'licenses' | 'photos';
  onChange: (tab: 'payments' | 'licenses' | 'photos') => void;
  counts: Record<'payments' | 'licenses' | 'photos', number>;
  risks: Record<'payments' | 'licenses' | 'photos', boolean>;
}) {
  const items: Array<{ key: 'payments' | 'licenses' | 'photos'; label: string }> = [
    { key: 'payments', label: 'Payments' },
    { key: 'licenses', label: 'Driver docs' },
    { key: 'photos', label: 'Menu photos' },
  ];
  return (
    <View style={[styles.sectionNav, { marginBottom: 12 }]}>
      {items.map((item) => {
        const selected = active === item.key;
        const risk = risks[item.key];
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navPill, selected && styles.navPillActive]}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.navPillText, selected && styles.navPillTextActive]}>
              {item.label} ({counts[item.key]})
            </Text>
            {risk && (
              <View style={[styles.badge, styles.badgeWarning, { marginTop: 4 }]}>
                <Text style={[styles.badgeText, styles.badgeWarningText]}>Risk</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type Sorter<T> = (a: T, b: T) => number;

function usePaged<T>(
  items: T[],
  pageSize = 10,
  queryKeys: (keyof T)[],
  initialQuery = '',
  sorter?: Sorter<T>,
  predicate?: (item: T) => boolean
) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setPage(0);
    }
  }, [initialQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = predicate ? items.filter(predicate) : items;
    if (!q) return base;
    return base.filter((item) =>
      queryKeys.some((k) => {
        const val = (item as any)[k];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  }, [items, query, queryKeys, predicate]);

  const sorted = useMemo(() => {
    if (!sorter) return filtered;
    return [...filtered].sort(sorter);
  }, [filtered, sorter]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  const next = () => setPage((p) => Math.min(totalPages - 1, p + 1));
  const prev = () => setPage((p) => Math.max(0, p - 1));

  return { query, setQuery, page: clampedPage, totalPages, pageItems, filteredCount: filtered.length, prev, next, setPage };
}

function PaymentsSection({ initialQuery = '', ...vm }: SectionProps) {
  const [sort, setSort] = useState<'newest' | 'value' | 'mismatch'>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | 'mismatch' | 'recent'>('all');
  const paymentSorter = useMemo(() => {
    if (sort === 'value') {
      return (a: any, b: any) => (Number(b.total_charged ?? b.total ?? 0) - Number(a.total_charged ?? a.total ?? 0));
    }
    if (sort === 'mismatch') {
      return (a: any, b: any) => {
        const diff = Number(vm.mismatch(b)) - Number(vm.mismatch(a));
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      };
    }
    return (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }, [sort, vm]);
  const { query, setQuery, pageItems, filteredCount, totalPages, page, next, prev, setPage } = usePaged(
    vm.reviewQueue,
    8,
    ['id', 'customer_payment_txn_id', 'restaurant_id', 'user_id'],
    initialQuery,
    paymentSorter,
    (item) => {
      if (statusFilter === 'mismatch') return vm.mismatch(item as any);
      if (statusFilter === 'recent') {
        const created = (item as any).created_at ? new Date((item as any).created_at).getTime() : 0;
        return Date.now() - created < 1000 * 60 * 60 * 24;
      }
      return true;
    }
  );
  const savedChips = [
    { label: 'Txn', value: 'txn:' },
    { label: 'Order', value: 'order:' },
    { label: 'Restaurant', value: 'restaurant:' },
    { label: 'Customer', value: 'user:' },
  ];
  const presets = [
    { label: 'Last 24h', value: '' },
    { label: 'Mismatch only', value: '' },
  ];
  const sortOptions = [
    { key: 'newest', label: 'Newest' },
    { key: 'value', label: 'Value' },
    { key: 'mismatch', label: 'Mismatch' },
  ];
  const statusOptions = [
    { key: 'all', label: 'All' },
    { key: 'mismatch', label: 'Mismatch' },
    { key: 'recent', label: 'Recent (24h)' },
  ];
  const [bulkLoading, setBulkLoading] = useState(false);

  const bulkApprove = async () => {
    if (!pageItems.length) return;
    Alert.alert('Approve all visible?', `${pageItems.length} items`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setBulkLoading(true);
          for (const item of pageItems) {
            await vm.handleApprove(item.id);
          }
          setBulkLoading(false);
        },
      },
    ]);
  };

  const bulkRejectMismatch = async () => {
    const mismatches = pageItems.filter(vm.mismatch);
    if (!mismatches.length) return;
    Alert.alert('Reject mismatches?', `${mismatches.length} items`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setBulkLoading(true);
          for (const item of mismatches) {
            await vm.handleReject(item.id, 'mismatch:bulk');
          }
          setBulkLoading(false);
        },
      },
    ]);
  };

  return (
    <View style={styles.sectionCard}>
      <ReviewFilters
        query={query}
        onChangeQuery={setQuery}
        count={pageItems.length}
        total={filteredCount}
        savedChips={savedChips}
        presets={presets}
        statusOptions={statusOptions}
        status={statusFilter}
        onChangeStatus={(key) => setStatusFilter(key as any)}
        sortOptions={sortOptions}
        sort={sort}
        onChangeSort={(key) => setSort(key as any)}
        page={page}
        totalPages={totalPages}
        onJumpPage={setPage}
        onPrev={prev}
        onNext={next}
        disablePrev={page === 0}
        disableNext={page >= totalPages - 1}
        pageLabel={`Page ${page + 1} / ${totalPages}`}
      />
      <View style={[styles.buttonRow, { marginTop: 4 }]}>
        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={bulkApprove}
          disabled={bulkLoading || !pageItems.length}
        >
          <Text style={styles.outlineButtonText}>{bulkLoading ? 'Working…' : 'Approve all visible'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={bulkRejectMismatch}
          disabled={bulkLoading || !pageItems.some(vm.mismatch)}
        >
          <Text style={styles.outlineButtonText}>{bulkLoading ? 'Working…' : 'Reject mismatches'}</Text>
        </TouchableOpacity>
      </View>
      <AdminState
        loading={vm.paymentLoading}
        error={vm.paymentError}
        emptyMessage="No payments to review."
        onAction={vm.refreshAll}
        actionLabel="Refresh queue"
        hint="If items are missing, check ingest/receipt upload jobs."
      >
        <PaymentReviewList
          items={pageItems}
          loading={vm.paymentLoading}
          error={vm.paymentError}
          mismatch={vm.mismatch}
          onApprove={vm.handleApprove}
          onReject={vm.handleReject}
        />
      </AdminState>
    </View>
  );
}

function LicenseSection({ initialQuery = '', ...vm }: SectionProps) {
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recent'>('all');
  const sorter = useMemo(() => {
    if (sort === 'oldest') {
      return (a: any, b: any) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    }
    return (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  }, [sort]);
  const { query, setQuery, pageItems, filteredCount, totalPages, page, next, prev, setPage } = usePaged(
    vm.licenseQueue,
    8,
    ['driver_id', 'full_name', 'email', 'license_number'],
    initialQuery,
    sorter,
    (item) => {
      if (statusFilter === 'recent') {
        const updated = item.updated_at ? new Date(item.updated_at).getTime() : 0;
        return Date.now() - updated < 1000 * 60 * 60 * 24;
      }
      return true;
    }
  );
  const sortOptions = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
  ];
  const statusOptions = [
    { key: 'all', label: 'All' },
    { key: 'recent', label: 'Recent (24h)' },
  ];

  return (
    <View style={styles.sectionCard}>
      <ReviewFilters
        query={query}
        onChangeQuery={setQuery}
        count={pageItems.length}
        total={filteredCount}
        statusOptions={statusOptions}
        status={statusFilter}
        onChangeStatus={(key) => setStatusFilter(key as any)}
        sortOptions={sortOptions}
        sort={sort}
        onChangeSort={(key) => setSort(key as any)}
        page={page}
        totalPages={totalPages}
        onJumpPage={setPage}
        onPrev={prev}
        onNext={next}
        disablePrev={page === 0}
        disableNext={page >= totalPages - 1}
        pageLabel={`Page ${page + 1} / ${totalPages}`}
      />
      <AdminState
        loading={vm.licenseLoading}
        emptyMessage="No driver documents to review."
        onAction={vm.refreshAll}
        actionLabel="Refresh queue"
        hint="If signups are paused, verify driver onboarding."
      >
        <LicenseReviewList
          items={pageItems}
          loading={vm.licenseLoading}
          statusText={null}
          onApprove={(id) => vm.handleLicenseDecision(id, 'approved')}
          onReject={(id, reason) => vm.handleLicenseDecision(id, 'rejected', reason)}
        />
      </AdminState>
    </View>
  );
}

function PhotoSection({ initialQuery = '', ...vm }: SectionProps) {
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recent'>('all');
  const sorter = useMemo(() => {
    if (sort === 'oldest') {
      return (a: any, b: any) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    }
    return (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  }, [sort]);
  const { query, setQuery, pageItems, filteredCount, totalPages, page, next, prev, setPage } = usePaged(
    vm.photoQueue,
    8,
    ['menu_item_id', 'restaurant_name', 'name'],
    initialQuery,
    sorter,
    (item) => {
      if (statusFilter === 'recent') {
        const updated = item.updated_at ? new Date(item.updated_at).getTime() : 0;
        return Date.now() - updated < 1000 * 60 * 60 * 24;
      }
      return true;
    }
  );
  const sortOptions = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
  ];
  const statusOptions = [
    { key: 'all', label: 'All' },
    { key: 'recent', label: 'Recent (24h)' },
  ];

  return (
    <View style={styles.sectionCard}>
      <ReviewFilters
        query={query}
        onChangeQuery={setQuery}
        count={pageItems.length}
        total={filteredCount}
        statusOptions={statusOptions}
        status={statusFilter}
        onChangeStatus={(key) => setStatusFilter(key as any)}
        sortOptions={sortOptions}
        sort={sort}
        onChangeSort={(key) => setSort(key as any)}
        page={page}
        totalPages={totalPages}
        onJumpPage={setPage}
        onPrev={prev}
        onNext={next}
        disablePrev={page === 0}
        disableNext={page >= totalPages - 1}
        pageLabel={`Page ${page + 1} / ${totalPages}`}
      />
      <AdminState
        loading={vm.photoLoading}
        emptyMessage="No menu photos to review."
        onAction={vm.refreshAll}
        actionLabel="Refresh queue"
        hint="If menus were updated, confirm photo upload pipeline."
      >
        <PhotoReviewList
          items={pageItems}
          loading={vm.photoLoading}
          statusText={null}
          onApprove={(id) => vm.handleMenuPhotoDecision(id, 'approved')}
          onReject={(id, reason) => vm.handleMenuPhotoDecision(id, 'rejected', reason)}
        />
      </AdminState>
    </View>
  );
}
