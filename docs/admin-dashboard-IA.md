# Admin Dashboard – Discovery & IA (Phase 1)

## Current surface audit
- Routes: `app/admin/index.tsx` (redirect), `metrics.tsx` (overview/approvals), `orders.tsx`, `payouts.tsx`, `analytics.tsx`, `reviews.tsx`, `settings.tsx`, `safety-events.tsx`, `substitutions.tsx`.
- Shared shell & navigation: `components/admin/AdminShell.tsx`, `SectionNav.tsx`, `AdminState.tsx`, `AdminToast.tsx`, `AdminWorkflow.tsx`.
- Core dashboard views/cards: `AdminMetricsPage.tsx` (hero + approvals + payouts), `HeroStats.tsx`, `AlertsSnapshot.tsx`, `SettlementBlocks.tsx`, `PayoutBalances.tsx`, `PayoutQueues.tsx`, `PaymentReviewList.tsx`, `LicenseReviewList.tsx`, `PhotoReviewList.tsx`, `OrderIssues.tsx`, `OrderAdminList.tsx`, `OrderAdminDetailView.tsx`, `AgingPayables.tsx`, `ManualTools.tsx`, `RolloutConfig.tsx`, `PaymentsFilters.tsx`, `PayoutFilters.tsx`, `ActionBanner.tsx`.
- Hooks: `hooks/useAdminGate.ts` (auth/claim guard), `useAdminOpsData.ts` (money/payables + approvals data), `useAdminReports.ts` (alerts/settlement/issues), `useAdminMetricsCoordinator.ts` (aggregates data + actions for metrics page).
- Styles: `styles/adminMetrics.ts` (shared typography, colors, spacing, nav pills, cards, badges, fee grid, hero stats).

## Data dependencies (utils/db/adminOps.ts)
- Reviews & approvals: `list_payment_review_queue`, `approve_payment_review`, `reject_payment_review`, `list_driver_license_reviews`, `review_driver_license`, `list_menu_photo_reviews`, `review_menu_photo`, `submit_payment_proof` (manual helper).
- Payables & payouts: `list_restaurant_payables`, `list_driver_payables`, `initiate_*_payout`, `finalize_*_payout`, `retry*` helpers, `list_payout_balances`, `settle_wallet_balance`, `list_wallet_transactions_for_user`, `list_aging_payables`.
- Orders visibility & detail: `list_restaurant_payment_visibility`, `list_driver_payout_visibility`, `get_order_admin_detail`.
- Ops & alerts: `get_ops_alerts_snapshot`, `get_ops_playbook`, `list_order_state_issues`, `list_delivery_state_issues`, `daily_settlement_report`.
- Analytics: `admin_totals`, `admin_driver_profit`, `admin_restaurant_profit`, `reconcile_settlement_import`.

## Target page map (clarify entry points)
- **Overview**: KPI hero, alerts snapshot, backlog summaries, quick actions (refresh/sign-out) — likely housed at `/admin/metrics` or new `/admin/overview`.
- **Approvals**: Payments, driver licenses, menu photos (existing lists) with filters and status toasts.
- **Orders/Deliveries**: Issues list + order detail drawer, delivery state issues, timelines.
- **Payouts**: Balances, restaurant/driver queues, filters, retry actions, aging payables.
- **Analytics**: Totals, driver/restaurant profit, charts (placeholder-ready), filters.
- **Settings**: Admin/tools surface including rollout config, manual tools, safety/ops utilities (safety-events, substitutions as needed).

## File-size guardrails (700-line cap)
- Largest admin-related file: `utils/db/adminOps.ts` (≈674 lines) — candidate to split by domain (approvals, payables, analytics) if expanded.
- `components/admin/ManualTools.tsx` (≈341 lines) — monitor if new utilities are added.
- All other admin components/routes/hooks are <200 lines; keep new work modular (subcards, filter components) to stay under 700.

## Notes for next phases
- Introduce layout primitives (responsive grid/tokens) without inflating `adminMetrics` styles; consider a dedicated `adminTheme.ts` to avoid hard-coded values.
- When expanding pages, extract section cards/components to keep route files slim and reusable across mobile/tablet/web breakpoints.
