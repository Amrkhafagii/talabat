import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

vi.mock('@/utils/database', () => {
  const noop = vi.fn();
  return {
    getTrustedArrivalMetrics: vi.fn().mockResolvedValue([
      {
        restaurant_id: 'rest-1',
        metric_date: '2025-07-01',
        on_time_pct: 90,
        reroute_rate: 5,
        substitution_acceptance: 80,
        credit_cost: 10,
        affected_orders: 5,
        csat_affected: null,
        csat_baseline: null,
      },
    ]),
    getTrustedRolloutConfig: vi.fn().mockResolvedValue({
      observeOnly: true,
      substitutionsEnabledFor: [],
      rerouteEnabledFor: [],
      killSwitchOnTime: 85,
      killSwitchRerouteRate: 20,
      killSwitchCreditBudget: 50,
    }),
    upsertTrustedRolloutConfig: vi.fn().mockResolvedValue(true),
    runKillSwitch: vi.fn().mockResolvedValue(true),
    runPopulateMetrics: vi.fn().mockResolvedValue(true),
    getPaymentReviewQueue: vi.fn().mockResolvedValue([]),
    getRestaurantPayablesPending: vi.fn().mockResolvedValue([]),
    getDriverPayablesPending: vi.fn().mockResolvedValue([]),
    approvePaymentReview: vi.fn().mockResolvedValue(true),
    rejectPaymentReview: vi.fn().mockResolvedValue(true),
    submitPaymentProofManual: vi.fn().mockResolvedValue({ ok: true, result: { status: 'paid', auto_verified: true } }),
    markRestaurantPayoutManual: vi.fn().mockResolvedValue({ ok: true, status: 'paid' }),
    markDriverPayoutManual: vi.fn().mockResolvedValue({ ok: true, status: 'paid' }),
    getOpsAlertsSnapshot: vi.fn().mockResolvedValue(null),
    reconcileSettlementImport: vi.fn().mockResolvedValue({ ok: true, result: [] }),
    retryRestaurantPayout: vi.fn().mockResolvedValue({ ok: true }),
    retryDriverPayout: vi.fn().mockResolvedValue({ ok: true }),
    retryDuePayouts: vi.fn().mockResolvedValue({ restRetried: 0, driverRetried: 0, errors: [] }),
    getOpsPlaybook: vi.fn().mockResolvedValue({ payout_failures: { steps: ['Retry hourly', 'Escalate after 3 attempts'] } }),
    getOrderAdminDetail: vi.fn().mockResolvedValue(null),
    getSettlementReport: vi.fn().mockResolvedValue(null),
    getAgingPayables: vi.fn().mockResolvedValue([]),
  };
});

import AdminMetrics from '@/app/admin/metrics';

describe('Admin metrics smoke', () => {
  it('renders trusted arrival metrics and rollout controls', async () => {
    const { getByText } = render(<AdminMetrics />);
    await waitFor(() => {
      expect(getByText('Trusted Arrival Ops')).toBeTruthy();
      expect(getByText('Trusted Arrival Metrics (7d)')).toBeTruthy();
      expect(getByText(/On-time %/)).toBeTruthy();
    });
  });

  it('shows payment ops sections', async () => {
    const { getByText } = render(<AdminMetrics />);
    await waitFor(() => {
      expect(getByText('Payments Ops')).toBeTruthy();
      expect(getByText('Record customer payment proof (Instapay screenshot)')).toBeTruthy();
      expect(getByText('Manually mark payout (after Instapay transfer)')).toBeTruthy();
    });
  });
});
