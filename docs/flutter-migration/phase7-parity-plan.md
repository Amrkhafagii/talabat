# Phase 7 – Persona Parity Closure Plan

Status: In progress  
Target duration: 4–5 weeks  
Owners: Flutter squad leads per persona plus QA/Telemetry partners  

## Objectives
1. Ship Flutter equivalents for every React Native (Expo) screen inventoried in `phase0-discovery.md`, covering customer, restaurant, delivery, and admin personas.
2. Extend automated + manual testing to guarantee each newly migrated flow has at least one happy-path widget/integration test and an explicit QA checklist.
3. Instrument telemetry so success/failure events for each critical flow arrive in Supabase, enabling cutover confidence ahead of Phase 8/9.

## Workstream 1 – Customer Experience

| RN screen(s) | Flutter destination | Implementation notes | Tests | Telemetry |
| --- | --- | --- | --- | --- |
| `addresses.tsx`, `add-address.tsx`, `edit-address.tsx`, `select-address.tsx` | `flutter/apps/talabat_app/lib/src/features/customer/addresses/` | Build `AddressListPage`, `AddEditAddressPage`, `SelectAddressSheet` using `LocationController` for GPS autofill and Supabase RPCs (`set_default_address`). | Widget test: address CRUD flow; Integration test: checkout pulling default address. | `TelemetryEvent(name: 'address_created')`, `'address_set_default'`, failure events with validation errors. |
| `profile.tsx`, `edit-profile.tsx` | `customer_profile_page.dart` | Port profile view + edit form, tie to `AuthController` metadata and Supabase update mutation. Handle avatar upload via design-system file picker. | Widget test: profile form validation; Integration: update profile -> confirm data. | `TelemetryEvent(name: 'profile_updated')` success/error. |
| GPS pin-drop (shared) | `address_map_picker.dart` | Implement map-based coordinate picker using `google_maps_flutter` + location permissions. Reuse for address add/edit. | Golden/widget verifying map overlay plus integration coverage inside address test above. | `TelemetryEvent(name: 'address_pin_drop')`. |
| Wallet/Instapay edge cases | `wallet_page.dart` updates | Add test hooks for pending payouts, errors, manual proof re-upload. Ensure `WalletRepository` handles negative balances. | Integration test verifying wallet summary and manual proof fallback. | `TelemetryEvent(name: 'wallet_proof_resubmitted')`, `'wallet_error_toast'`. |

## Workstream 2 – Restaurant Console

| RN screen(s) | Flutter destination | Implementation notes | Tests | Telemetry |
| --- | --- | --- | --- | --- |
| `performance.tsx`, `metrics.tsx` | `restaurant_performance_page.dart` & `restaurant_metrics_page.dart` | Use `RestaurantRepository` to expose analytics + trusted-arrival metrics; add chart widgets via design system. | Widget tests for KPI cards; Integration test verifying RPC mock data renders graphs. | `TelemetryEvent(name: 'restaurant_metrics_viewed')`. |
| `category-manager.tsx` | `category_manager_page.dart` | CRUD for menu categories, drag & drop ordering, Supabase RPC/REST per `utils/db/dashboard.ts`. | Widget test for reorder logic; Integration for create/update. | `TelemetryEvent(name: 'category_updated')`. |
| `order-detail/[orderId].tsx` | `restaurant_order_detail_page.dart` | Detailed order view with timeline, contact info, actions (hold/capture). Reuse shared order status provider. | Widget test for rendering states; Integration for action triggers. | `TelemetryEvent(name: 'restaurant_order_action')`. |
| `settings.tsx` (hours, GPS, team) | `restaurant_settings_page.dart` | Manage opening hours + GPS pin drop + staff invites; reuse map picker. | Widget test for hours form; Integration for staff invite flow. | `TelemetryEvent(name: 'restaurant_settings_saved')`. |
| `wallet.tsx`, `payout-confirm.tsx`, `kyc/*` edge cases | extend `_WalletTab` | Add documents list, status timeline, manual payout proof attachments. | Integration for payout confirm flow. | `TelemetryEvent(name: 'restaurant_payout_request')`. |

## Workstream 3 – Delivery & Ops

| RN screen(s) | Flutter destination | Implementation notes | Tests | Telemetry |
| --- | --- | --- | --- | --- |
| `earnings.tsx`, `history.tsx` | `delivery_earnings_page.dart`, `delivery_history_page.dart` | Surface completed jobs, payout ledger, weekly summaries. Extend `DeliveryRepository`. | Widget tests for list rendering; Integration verifying ledger math. | `TelemetryEvent(name: 'delivery_earnings_viewed')`. |
| `wallet.tsx`, `payout-confirm.tsx` | `delivery_wallet_page.dart` | Mirror restaurant wallet features for drivers, including proof uploads. | Integration tests for payout flow. | `TelemetryEvent(name: 'driver_payout_requested')`. |
| `cancel.tsx`, `issue-report.tsx`, `feedback.tsx` | `delivery_issue_sheet.dart`, `delivery_feedback_page.dart` | Structured incident + cancellation reasons, optional photos/audio, automatic linking to orders. | Widget test for reason selection; Integration for incident submission. | `TelemetryEvent(name: 'delivery_incident_submitted')`. |
| `profile.tsx`, availability toggles | `delivery_profile_page.dart` | Manage vehicle info, license docs, availability schedule, push toggles. | Widget test for toggle state; Integration for doc upload. | `TelemetryEvent(name: 'driver_availability_changed')`. |
| Reinforced incident UX | shared components | Add toast/alert flows plus offline state caching for incidents. | Integration test toggling offline mode. | Failure telemetry `name: 'delivery_incident_error'`. |

## Workstream 4 – Admin Surfaces

| RN screen(s) | Flutter destination | Implementation notes | Tests | Telemetry |
| --- | --- | --- | --- | --- |
| `orders.tsx` | `admin_orders_page.dart` | Filterable orders triage with SLA counts, RLS via `AdminRepository`. Provide inline actions (reroute, refund). | Widget test for filter chips; Integration for reroute path. | `TelemetryEvent(name: 'admin_order_action')`. |
| `payouts.tsx` | `admin_payouts_page.dart` | Multi-queue payouts view covering drivers + restaurants; link to manual review flows. | Integration for payout approval. | `TelemetryEvent(name: 'admin_payout_reviewed')`. |
| `reviews.tsx` | `admin_reviews_page.dart` | Menu photo and driver license review queue; file viewer via `webview_flutter` if needed. | Widget test for review decision; Integration for Supabase update. | `TelemetryEvent(name: 'admin_review_decision')`. |
| `settings.tsx` | `admin_settings_page.dart` | Manage feature flags + ops settings; connect to `FeatureFlagService` CRUD. | Widget test for flag toggles; Integration for save/cancel. | `TelemetryEvent(name: 'feature_flag_changed')`. |

## Traceability & QA

- **Traceability matrix** – Generate `docs/flutter-migration/phase7-traceability.csv` (scripted from a JSON source) mapping each RN screen to:
  - Flutter route/file.
  - Implementation owner.
  - Test artifacts (widget/integration IDs).
  - QA checklist link.
- **QA playbooks** – For every persona, produce a Notion/Markdown checklist executed twice (mid sprint & pre-release). Include edge cases (offline flows, error handling).
- **Telemetry verification** – Add Supabase dashboard panels showing event counts per new feature; QA validates by triggering success/failure events at least once per build.

## Milestones & Checkpoints

| Milestone | Date (target) | Exit proof |
| --- | --- | --- |
| M1 – Customer parity complete | Week 2 | Address/profile features merged, widget/integration tests green, QA sign-off doc. |
| M2 – Restaurant/admin parity | Week 3 | Performance dashboards + admin orders/payouts live; telemetry events present in Supabase. |
| M3 – Delivery parity | Week 4 | Earnings/history + incident revamp shipped with associated tests. |
| M4 – Traceability & QA closure | Week 5 | Matrix auto-generated, telemetry dashboards validated, stakeholder go/no-go review ahead of Phase 8. |

## Dependencies & Risks

- **Supabase contracts**: some RPCs (category manager, review queues) may need schema updates. Coordinate with backend before Flutter implementation.
- **Map/pin-drop licensing**: ensure `google_maps_flutter` keys configured for restaurant + customer flows.
- **Testing time**: expanding integration coverage increases CI minutes; adjust Melos scripts to shard tests per package.
- **Design bandwidth**: new settings/dashboards require final Figma references; schedule reviews early to avoid blocking development.

## Reporting

- Weekly Phase 7 standup notes captured in `docs/flutter-migration/status/phase7-weekly.md`.
- Dashboard: update Notion/Linear to reflect persona task burndown, linking to traceability entries.
- Definition of done: no RN screen left unmapped, tests + telemetry + QA verified, design/product approvals archived alongside PR links.
