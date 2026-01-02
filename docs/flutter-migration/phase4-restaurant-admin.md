# Phase 4 – Restaurant Console & Admin Surfaces

## Overview
- Duration: 5–6 weeks (completed).
- Scope: migrate restaurant operations (orders, menu editing, wallet/KYC/payout) and the internal admin console (analytics, payout tooling, queue monitoring, report export) to Flutter.

## Restaurant Console Deliverables
1. **Orders Tab** – Live Supabase-backed order feed with status, customer name, items, and total, mirroring the Expo restaurant dashboard (`RestaurantOrder` models, `_OrdersTab` UI in `restaurant_dashboard_page.dart`).
2. **Menu Management** – Full CRUD workflow for menu items with availability toggles and image uploads using `ImagePicker` + Supabase Storage. `MenuEditorItem` data flows from `RestaurantRepository.upsertMenuItem` and the tab-level editor dialog.
3. **Wallet & KYC/Payouts** – Wallet summary (`WalletSummary` now exposes `walletId`), Instapay/KYC status via `get_kyc_status`, document uploads (file picker), and payout requests calling `initiate_restaurant_payout` (`_WalletTab`).

## Admin Console Deliverables
1. **Analytics & KPI Grid** – `AdminDashboardPage` consumes `admin_totals`, `admin_queue_counts`, `admin_driver_profit`, and `admin_restaurant_profit` RPCs to present totals, queue depth, and profit leaderboards.
2. **Queue Monitoring** – Dedicated badges for payment review, photo review, and support queues, keeping operations visibility at parity with Expo.
3. **Report Export** – Wallet transaction export tool that fetches rows via `list_wallet_transactions_for_user` and copies CSV data to the clipboard, covering the “downloadable reports” requirement.
4. **Navigation Hooks** – Restaurant dashboard includes a shortcut into the admin console so privileged users can jump between consoles quickly.

## Shared Infrastructure
- New `restaurant_repository.dart` encapsulates Supabase calls for orders, menus, wallet, KYC, and payout workflows, ensuring RLS-friendly access patterns.
- New `admin_repository.dart` wraps analytics RPCs defined in `supabase/migrations/20260308022000_admin_analytics.sql` and payout tooling from `supabase/migrations/20260308030000_admin_payout_tools.sql`.

## Risks & Mitigations
- **Analytics view drift**: by centralizing RPC calls in `admin_repository.dart`, we can add integration tests/SQL checks whenever migrations change the views.
- **Menu media uploads**: file picker + Supabase storage ensures photos are stored in a consistent bucket; forms validate before calling RPCs, reducing broken entries.
- **KYC compliance**: `submitKycDocument` ensures documents reach the `restaurant_kyc_documents` table, and status polling uses `get_kyc_status` so the UI matches backend review decisions.

## Next Steps
- Extend Phase 5 (delivery/ops tooling) using the same service layer.
- Add widget/golden tests around menu dialogs, wallet tab, and admin metric panels.
- Integrate push notifications for new restaurant orders once backend topics are ready.
