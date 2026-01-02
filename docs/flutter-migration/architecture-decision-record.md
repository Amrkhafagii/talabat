# Architecture Decision Record – Flutter Migration

## ADR-001: Workspace & Tooling (Phase 1)
- **Context**: Need a scalable structure for multiple persona apps, shared packages, and CI automation before feature work begins.
- **Decision**: Adopt a Melos-managed monorepo under `/flutter`, with shared analysis options and scripts for `analyze`, `test`, `format`.
- **Status**: Accepted (Phase 1).
- **Consequences**: Consistent tooling across packages, easier dependency graph management, CI integration via GitHub Actions.

## ADR-002: State & Navigation Stack
- **Context**: Expo Router currently uses nested stacks and context providers. Flutter equivalent must support tab shells, admin gating, and auth redirects.
- **Decision**: Use `go_router` plus Riverpod providers. One `ShellRoute` models `(tabs)` (customer, restaurant, delivery) and admin routes live outside the shell. Riverpod exposes `supabase.auth.onAuthStateChange` for redirects.
- **Consequences**: Declarative navigation aligned with original layout; hooking in new persona stacks remains straightforward.

## ADR-003: Supabase Integration & Env Management
- **Context**: Existing JS app relies on Supabase for nearly every workflow; Flutter must reuse same backend and ensure secure token storage.
- **Decision**: Build an `app_core` package that validates Dart-define env vars, initializes `supabase_flutter` with `flutter_secure_storage`, and exports providers. All feature modules depend on this instead of instantiating clients manually.
- **Consequences**: Centralized initialization, parity with Expo auto-refresh behavior, easier to mock in tests.

## ADR-004: Design System Port
- **Context**: `styles/appTheme.tsx` defines bespoke colors, spacing, radius, typography, iconography. Flutter needs identical tokens to avoid pixel drift.
- **Decision**: Introduce `design_system` package containing token definitions, theme builder, and base components (button, card, skeleton, icon map). The package is consumed by every app and will grow alongside migrating screens.
- **Consequences**: Single source of truth for styling, enabling golden tests and design QA across personas.

## ADR-005: Cross-cutting Service Package
- **Context**: Auth/session logic, push registration, location providers, realtime data hooks, and RPC wrappers were previously scattered across Expo hooks (`AuthContext`, `usePushRegistration`, `useRealtimeOrders`, etc.). Flutter needs a dedicated layer so persona modules can remain lean.
- **Decision**: Create `app_services` package sitting on top of `app_core`, exposing Riverpod-friendly controllers (`AuthController`, `LocationController`, `DriverLocationTracker`), FCM push registration, realtime order/delivery streams, and typed repositories (starting with `OrdersRepository`).
- **Consequences**: Shared service layer can be tested independently and reused by multiple apps (mobile, admin web). It also provides a single location for staging contract tests against Supabase.

## ADR-006: Restaurant/Admin Service Layer & Consoles
- **Context**: Restaurant operations (orders, menu editing, payouts, KYC) and admin analytics/payout tooling require consistent Supabase access and desktop-friendly UIs, tied to the SQL views introduced during backend hardening.
- **Decision**: Extend `app_services` with `RestaurantRepository` and `AdminRepository` (plus their models) to wrap menu/order/wallet/KYC logic and analytics RPCs. Build Flutter screens (`RestaurantDashboardPage`, enhanced `AdminDashboardPage`) that consume these repositories with file-picker workflows, Supabase storage uploads, and RPC-driven metrics.
- **Consequences**: Restaurant and admin personas now depend on the same typed contracts as the backend, reducing RLS drift and providing a clear place to add regression tests whenever SQL views change.

## ADR-007: Telemetry & Feature Flags
- **Context**: Phase 6 requires parity monitoring during the Flutter ↔︎ Expo dual-run along with a quick rollback mechanism when KPIs slip. Previous Expo telemetry relied on ad-hoc console logging and manual flagging.
- **Decision**: Introduce an `AnalyticsService` in `app_services` that writes structured events/crashes to Supabase tables (`telemetry_events`, `telemetry_crashes`) and wire the Flutter bootstrap to report uncaught errors. Add a `FeatureFlagService` backed by a `feature_flags` table and expose `featureFlagsProvider` so UI layers can opt-in/out of risky features without redeployment.
- **Consequences**: Telemetry dashboards can compare Flutter vs. Expo traffic using the same backend store, while feature toggles let ops pause admin exports, incident hints, or beta banners instantly. The services are injectable/mocked for tests, encourage future instrumentation, and keep Phase 6 release criteria auditable.
