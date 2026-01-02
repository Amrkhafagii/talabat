# Phase 3 – Customer Experience Vertical

## Scope & Status
- Duration: 5–6 weeks (completed).
- Objective: Port the customer vertical from the Expo app to Flutter, covering auth, discovery, ordering, tracking, wallet/Instapay, and payment proof flows.

## Key Deliverables
1. **Authentication** – `LoginPage` and `SignupPage` now provide production-ready forms with validation, role selection, and hook directly into `authControllerProvider` for Supabase sign-in/up flows (`flutter/apps/talabat_app/lib/src/features/auth/pages/`).
2. **Customer Home & Discovery** – `CustomerHomePage` uses `CustomerHomeController` + `CustomerRepository` to pull categories, restaurants, filters, favorites, and ETA ribbons derived from the ported `computeEtaBand` utility (`app_services/lib/src/eta`). Quick filters and search mirror Expo UX.
3. **Restaurant Detail & Cart/Checkout** – Detailed menu view (`restaurant_detail_page.dart`) fetches items, feeds a shared `CartController`, and the checkout flow calls `create_order_payment_pending` via `OrdersRepository`, wiring delivery instructions, tips, and default addresses from `LocationController`.
4. **Order Status & Tracking** – `OrderStatusPage` consumes the new `orderStatusProvider` stream (backed by realtime Supabase channels) with progress steps, ETA banners, and deep links to open driver coordinates in native maps.
5. **Wallet & Instapay** – `WalletPage` reads balances/transactions from Supabase via `WalletRepository`, providing visibility into pending payouts and recent activity.
6. **Payment Proof Upload** – `PaymentProofPage` integrates `file_picker`/`image_picker`, uploads bytes to Supabase Storage through `PaymentProofService`, and invokes the `submit_payment_proof` RPC, matching the Expo workflow.

## Risks & Mitigations
- **List performance**: home feed and menus use `ListView` with lightweight cards; design-system skeletons cover loading states. Future work can add pagination if Supabase datasets grow.
- **ETA parity**: the `computeEtaBand` helper was ported from JS to Dart and is used consistently across cards and order tracking to avoid divergent labels.
- **Map deep links**: `url_launcher` opens Google Maps with driver coordinates; a later enhancement can embed native maps once background location is stable.

## Next Steps
- Extend repositories/controllers for restaurant and delivery personas (Phases 4 & 5).
- Add golden tests for customer UI components and widget tests for checkout/order tracking flows.
- Hook push notifications into order status updates once the backend topics are defined.
