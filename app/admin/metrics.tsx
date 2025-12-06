import React from 'react';
import AdminMetricsPage from '@/components/admin/AdminMetricsPage';
import { useAdminMetricsCoordinator } from '@/hooks/useAdminMetricsCoordinator';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminGate } from '@/hooks/useAdminGate';

export default function AdminMetrics() {
  const { allowed, loading, signOut, user } = useAdminGate();
  const viewModel = useAdminMetricsCoordinator();

  if (loading || !allowed) return null;

  return (
    <AdminShell title="Dashboard" onSignOut={signOut} headerVariant="ios">
      <AdminMetricsPage userEmail={user?.email ?? 'Admin'} onSignOut={signOut} {...viewModel} />
    </AdminShell>
  );
}
