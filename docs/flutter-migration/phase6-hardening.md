# Phase 6 – Hardening, Parallel Beta & Cutover

## Overview
- Duration: 3–4 weeks (completed).
- Team: Full Flutter squad (customer, restaurant, delivery, admin owners), Supabase dev, shared QA, and design for polish passes.
- Goal: stabilize the Flutter build for public rollout by adding telemetry, feature gates, automated tests, and a dual-run release process that keeps Expo online until KPIs converge.

## Deliverables
1. **Telemetry & Crash Capture**
   - `flutter/packages/app_services/lib/src/analytics/analytics_service.dart` inserts structured events/crashes into Supabase tables (`telemetry_events`, `telemetry_crashes`).
   - `flutter/apps/talabat_app/lib/src/bootstrap/bootstrap.dart` now wires `FlutterError.onError` and `PlatformDispatcher.onError` to the analytics service so uncaught widgets/isolates are logged before rethrowing.
   - Events cover key flows (cart mutations, checkout, incident reporting). Future screens can inject the service via `analyticsServiceProvider`.

2. **Feature Flag Service**
   - `flutter/packages/app_services/lib/src/feature_flags/feature_flag_service.dart` fetches the `feature_flags` table and exposes `featureFlagsProvider`.
   - UI surfaces respond to the flags: customer home shows a beta banner, delivery dashboard toggles incident reminders, and admin exports are guard-railed (`customer_home_page.dart`, `delivery_dashboard_page.dart`, `admin_dashboard_page.dart`).
   - Defaults are safe (all enabled) so CI/dev builds keep functioning even if the table is empty.

3. **Automated Test Suite & Scripts**
   - Widget cover: `flutter/packages/design_system/test/talabat_button_test.dart` exercises the base CTA component.
   - Integration: `flutter/apps/talabat_app/integration_test/cart_flow_test.dart` boots Riverpod + the cart controller to ensure add-to-cart state works across renders.
   - `package.json` exposes `npm run test:flutter` (runs both `flutter test` and `flutter test integration_test`) and the root `npm test` chains contract + smoke + Flutter suites.

4. **CI & Release Guardrails**
   - GitHub Actions workflow `.github/workflows/flutter-ci.yml` now executes unit *and* integration tests via Melos when Flutter files change.
   - Melos scripts enforce `flutter test` for every package with a `test` directory and `flutter test integration_test` for apps that define one, preventing regressions before TestFlight submissions.

5. **Push Token Migration & Policy Cleanup**
   - `PushRegistrationService` (Phase 2) now runs as part of QA builds to collect Firebase Cloud Messaging tokens, and Supabase migrations `20250701005000_push_tokens_hardening.sql` keep Expo + Flutter tokens side-by-side.
   - Cutover checklist below captures when to remove Expo-only Supabase policies plus unused push token columns once metrics show parity.

## Parallel Beta & Monitoring Plan
1. **Side-by-Side Dogfood**
   - Internal staff run the Flutter build while Expo remains live; `feature_flags.enableAdminExports` stays false until Flutter dashboards pass QA to avoid duplicate CSV flows.
   - A QA rotation compares Expo vs. Flutter across sign-up, checkout, delivery, admin exports each day; issues are logged against the Flutter board with telemetry event IDs for traceability.

2. **KPI Dashboards**
   - Supabase SQL views backing `admin_totals`, `admin_queue_counts`, and telemetry tables feed Grafana/Metabase dashboards tracking order conversion, driver SLA, payout latency.
   - Flutter builds emit `TelemetryEvent(name: 'order_success')` after checkout; dashboards compare Flutter vs. Expo volume to detect drift.

3. **Feature Flags & Rollback**
   - Flags enable quick rollback of risky features (incident reporting, exports, beta banner). Toggle values live in Supabase so operations can revert without redeploying.
   - Release train: internal → QA (Firebase App Distribution/TestFlight) → staged App Store/Play rollout. Expo stays in store with a banner pointing to Flutter beta once metrics are within ±2% of control.

4. **Supabase Policy Retirement**
   - Once Flutter reaches 100% rollout, drop Expo-specific RLS policies via a follow-up migration (`supabase/migrations/20250701008000_rls_hardening.sql` acts as the template).
   - Keep dual write paths (Expo + Flutter) for `push_tokens` and telemetry for at least one release cycle before removing Expo clients.

## Risks & Mitigations
- **Dual-run fatigue**: Daily QA checklist auto-generated from the persona inventory ensures we do not skip screens; telemetry events bubble up the highest failure rates.
- **Data drift between clients**: Contract tests continue to run (`tests/contract/rpcs.test.mjs`) and Flutter repos now emit the same RPC payloads via typed repositories; dashboards compare expected vs. observed KPIs.
- **Crash under-reporting**: AnalyticsService catches network failures and degrades gracefully while logging to `developer.log`; Supabase row insertion errors no longer crash the UI.
- **Background services parity**: Driver background tracking still uses the `driverLocationTrackerProvider`; Phase 6 confirms iOS/Android background permission strings match store requirements before submission.

## Next Steps
1. Monitor telemetry dashboards post-release; require two weeks of parity before removing Expo binaries.
2. Archive feature flags (flip defaults to false or delete columns) once Flutter is sole client.
3. Extend analytics coverage to restaurant/admin exports if finance requests audit logs.
4. After cutover, decommission unused Expo push token jobs and tighten Supabase policies as documented above.
