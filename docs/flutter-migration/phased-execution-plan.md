# Flutter Migration – Phased Execution

## Phase 1 – Platform Foundation (Complete)

Deliverables achieved:
- Flutter monorepo skeleton located in `/flutter` using Melos.
- CI workflow `.github/workflows/flutter-ci.yml` runs analyze/test jobs.
- Design System package with tokens/components mirroring `styles/appTheme.tsx`.
- Application shell (`apps/talabat_app`) wired with `go_router`, Riverpod, Supabase bootstrap, and placeholder persona screens.
- Shared `app_core` package housing env validation, Supabase client, providers.

Next phases will extend these foundations with feature-complete modules per persona.

## Phase 2 – Cross-cutting Services & Infrastructure (Complete)

Deliverables achieved:
- `app_services` package providing auth/session controller with user-type gating, push registration (FCM), location providers, driver tracking, realtime orders/deliveries streams, and typed RPC wrappers (e.g., `OrdersRepository`).
- `talabat_app` now consumes the shared services for routing (role-aware redirects) and location display; customer home screen demonstrates live location/address binding.
- Push registration replaces Expo tokens with Firebase Messaging tokens stored via Supabase, matching the mitigation plan.
- Location services request permissions, fetch GPS coordinates, and sync default addresses via Supabase RPC `set_default_address`.
- Realtime services mirror `useRealtimeOrders` and `useRealtimeDeliveries` logic, keeping Flutter state in sync with Supabase channels.
- Contract-style tests added for RPC serialization (`orders_repository_test.dart`) with instructions to extend against staging Supabase.

Risks around realtime drift mitigated through centralized services and baseline tests; next phases will plug feature screens into these sources.

## Phase 3 – Customer Experience Vertical (Complete)

Deliverables achieved:
- Production-ready Flutter screens for auth (sign-in/up), customer discovery feed, restaurant details, cart, checkout, order tracking, wallet/Instapay, and payment proof uploads.
- `CustomerHomeController` with Supabase-backed categories/restaurants, filters, favorites, and ETA ribbons leveraging the ported `computeEtaBand` helper.
- Cart + checkout flow wired to `OrdersRepository.createOrderPaymentPending`, consuming location-provided default addresses and tips, then navigating to the realtime order status view.
- Order tracking UI (`OrderStatusPage`) powered by `orderStatusProvider` with timeline steps, ETA info, and map deep links for live driver coordinates.
- Wallet summary page via `WalletRepository` and payment proof uploads through Supabase storage + `submit_payment_proof` RPC.

Customer-facing functionality now matches the Expo app, enabling Phase 4 to focus on restaurant operations using the same shared services.

## Phase 4 – Restaurant Console & Admin Surfaces (Complete)

Deliverables achieved:
- Restaurant dashboard rebuilt with Supabase-driven orders, menu editor (image uploads + availability toggles), and wallet/KYC/payout workflows leveraging `get_kyc_status` + payout RPCs.
- New `RestaurantRepository` & models encapsulate menu/order/wallet logic, reusing the design system for advanced dialogs and file pickers.
- Admin console now consumes analytics/payout RPCs (`admin_totals`, `admin_queue_counts`, `admin_driver_profit`, `admin_restaurant_profit`, `list_wallet_transactions_for_user`) with metric cards, queue badges, leaderboards, and report export tooling.
- Wallet summary now exposes `walletId`, enabling real payout requests from Flutter, and export-to-clipboard provides a lightweight “downloadable report”.

This completes all shared surfaces (customer + restaurant + admin), setting the stage for delivery ops (Phase 5) and final hardening.

## Phase 5 – Delivery & Operations (Complete)

Deliverables achieved:
- Delivery repository/models now cover active jobs, cash reconciliation, status updates, and incident logging with Supabase RPCs (`update_delivery_status_safe`, `settle_driver_cash`, etc.).
- Flutter delivery screens implement navigation (map intents, pickup/drop-off details, status transitions), incident reporting, and cash reconciliation parity with the Expo app.
- Ops hooks (delay credits, reroute, safety) remain centralized via `orderStatusProvider` and the trusted-arrival services.

Delivery + ops experiences are now migrated, enabling Phase 6 hardening/dual-run efforts.

## Phase 6 – Hardening, Parallel Beta & Cutover (Complete)

Deliverables achieved:
- `AnalyticsService` + `analyticsServiceProvider` log widget errors and manual events into Supabase, and the Flutter bootstrap registers crash handlers for both Flutter and platform zones.
- New `FeatureFlagService` fetches the Supabase `feature_flags` table and the customer/delivery/admin UIs respond to toggles (beta banner, incident reminders, CSV export guard rails).
- Automated quality gates: widget and integration tests live under `flutter/packages/design_system/test` and `flutter/apps/talabat_app/integration_test`, invoked via `npm run test:flutter` (rerun by CI and `npm test`).
- GitHub workflow + Melos scripts execute unit + integration tests whenever Flutter code changes, guaranteeing regressions are caught before TestFlight/Play builds.
- Dual-run plan documented in `docs/flutter-migration/phase6-hardening.md` covering telemetry dashboards, feature flag rollout, Supabase policy cleanup, and Expo fallback strategy.

---

## Phase 7 – Persona Parity Closure (In Progress)

**Goal**: Close the remaining feature gaps discovered during the migration review so Flutter ships the full breadth of customer, restaurant, delivery, and admin workflows.

**Scope**:
- Customer: deliver address-book CRUD, GPS pin-drop, and profile editing parity, plus regression tests for wallet + Instapay edge cases.
- Restaurant: rebuild performance/metrics dashboards, category manager, deep order detail views, and settings (opening hours, GPS pin drop, staff management).
- Delivery: implement earnings/history, wallet + payout confirmation, cancellation & feedback flows, driver profile/availability, and reinforce incident logging UX.
- Admin: port the orders triage console, payouts queue, reviews/moderation panels, and settings/feature flag screens referenced in `phase0-discovery.md`.

**Exit Criteria**:
1. Traceability matrix links every RN screen listed in Phase 0 to a Flutter route/test.
2. Widget/integration tests cover at least one happy-path per persona gap above.
3. QA sign-off for each persona, with telemetry hooks emitting success/failure events per critical flow.

> Detailed work breakdown, milestones, and telemetry/test requirements live in `docs/flutter-migration/phase7-parity-plan.md`.

---

## Phase 8 – Service & Quality Expansion (Complete)

Deliverables achieved (see `docs/flutter-migration/phase8-service-quality.md` for deep dive):
- Supabase contract automation: `supabase/rpc-catalogue.json` and `scripts/build-supabase-openapi.mjs` emit the OpenAPI spec (`supabase/openapi/phase0-openapi.json`) plus generated Dart bindings (`flutter/packages/app_services/lib/src/generated/supabase_rpc_repository.dart`). CI now runs `npm run build:supabase-openapi` so contract drift becomes a build failure, and Node + Flutter contract tests share the same catalogue.
- Device capability punch list codified in `docs/flutter-migration/qa/device-capabilities.md` with manifest/plist snippets, QA steps, and sign-off artefacts for camera, document picker, background location, push, haptics, WebView, gradients, and deep links across iOS 18 / Android 15 hardware.
- Automated coverage added persona-by-persona: new widget tests for delivery payouts (`test/delivery/delivery_wallet_page_test.dart`) and admin exports/flags, plus integration suites for restaurant payout/manual proof, delivery incident queueing, and feature-flag gating (`integration_test/*_flow_test.dart`). `npm run test:flutter` executes these alongside the existing widget/integration grids in CI.
- Operational readiness documented via `docs/flutter-migration/runbook-*.md` (push token migration, telemetry dashboards, failure-handling) tying feature flags, telemetry dashboards, and rollback steps together for the ops team ahead of Expo removal.

Exit confirmed:
1. CI runs the expanded contract + widget/integration suites and blocks merges if any repository loses coverage.
2. QA matrix signed off for iOS/Android latest releases with background services validated and artefacts stored under `docs/flutter-migration/qa/`.
3. Runbooks linked above live under `docs/flutter-migration/`, satisfying the monitoring/rollback documentation requirement for ops.

---

## Phase 9 – React Native Decommission & Cleanup (Planned)

**Goal**: Remove the legacy Expo/React Native implementation, dependencies, and CI steps once telemetry proves Flutter parity.

**Scope**:
- Execute the cutover checklist: confirm KPIs within ±2% for two weeks, archive final RN build, announce freeze.
- Remove RN directories (`app`, `components`, `hooks`, `styles`, Expo config) plus Expo/React dependencies from `package.json`; regenerate lockfiles.
- Update CI/CD to run only Flutter/Melos pipelines; delete Expo lint/test jobs and related scripts.
- Retire Supabase policies, cron jobs, and push token handling that solely exist for Expo clients; tighten RLS per `phase6-hardening.md`.
- Add guardrails (lint rule or automation) preventing new RN files from landing post-cleanup.

**Exit Criteria**:
1. Repository no longer installs Expo/React Native packages; `npm test` delegates purely to Flutter/supabase contract suites.
2. CI/CD reflects the new reality (Flutter analyze/test/build only) and passes end-to-end.
3. Supabase schemas/policies verified against production showing no Expo-specific artifacts.
4. Post-cutover verification checklist signed by engineering, QA, and ops confirming telemetry dashboards track Flutter-only traffic.
