# Phase 8 – Service & Quality Expansion

## Overview
- Duration: 3 weeks.
- Team: Platform services pod (Supabase + tooling), Flutter QA pair, device lab coordinator, ops lead for runbooks.
- Goal: exceed the React Native baseline by codifying Supabase contracts, validating device capabilities, expanding automated suites, and publishing the operational guardrails required before Expo removal.

## Supabase Contract Automation
1. **RPC Catalogue + OpenAPI**
   - `supabase/rpc-catalogue.json` is the single source of truth for every Phase 0 RPC (orders, payouts, admin, delivery).
   - `npm run build:supabase-openapi` executes `scripts/build-supabase-openapi.mjs`, which emits `supabase/openapi/phase0-openapi.json` and a generated Dart binding `flutter/packages/app_services/lib/src/generated/supabase_rpc_repository.dart`.
   - The generated repository mirrors the Node contract tests (`tests/contract/rpcs.test.mjs`) so Flutter developers can call any RPC by name without hand-written glue.

2. **Contract Tests**
   - `flutter/packages/app_services/test/orders_repository_test.dart` now sits alongside the generated bindings to assert serialization parity.
   - Root contract suite delegates to the OpenAPI spec to ensure every RPC listed in the catalogue has a test entry; missing coverage fails CI with actionable guidance.

## Device Capability Punch List
- QA checklists live in `docs/flutter-migration/qa/device-capabilities.md`, pairing each capability with manifest toggles, runtime validation steps, and APK/IPA build identifiers.
- Platform updates:
  - Camera/document picker/photo uploads validated on both iOS 18 / Android 15 physical devices with storage permissions documented.
  - Background location + push tokens verified in Release mode builds with haptics/web view/gradients sanity tests captured as GIFs for regression diffs.
  - Deep links validated via `url_launcher` entries; manifest/plist snippets documented alongside QA steps.

## Automated Quality Gates
1. **Widget coverage**
   - Addresses (`test/customer/address_book_test.dart`), payouts (`test/delivery/delivery_wallet_page_test.dart`), incident flow (`test/delivery/delivery_issue_test.dart`), and admin exports (`test/admin/admin_pages_test.dart`) all gained assertions for analytics + repository behaviour.
2. **Integration suites**
   - `integration_test/restaurant_payout_flow_test.dart` boots the restaurant wallet tab to verify payout + manual proof flows respecting analytics hooks.
   - `integration_test/delivery_incident_flow_test.dart` covers offline queuing/flush plus feature-flag gating for delivery incident surfaces.
   - `integration_test/admin_feature_flag_test.dart` ensures the admin exports card hides until `FeatureFlags.enableAdminExports` is true.
   - Tests run via `npm run test:flutter`, and CI shards integrate them next to the contract suite so failures block merges.

## Operational Readiness
- Runbooks published in:
  - `docs/flutter-migration/runbook-push-token-migration.md`
  - `docs/flutter-migration/runbook-telemetry-dashboards.md`
  - `docs/flutter-migration/runbook-failure-handling.md`
- Each runbook includes monitoring sources, alert thresholds, manual recovery, and rollback toggles (feature flags or Supabase migrations).
- Telemetry dashboards align with the events emitted throughout the new tests, providing trace IDs for QA and support.

## Exit Confirmation
1. CI is green across contract/widget/integration suites with coverage totals logged in build artefacts.
2. Device QA matrix signed for iOS/Android with background tasks validated and screenshots stored in the QA folder.
3. Runbooks stored under `docs/flutter-migration/` and linked from this document and the master phased plan, ready for ops handoff ahead of Phase 9.
