# Phase 2 – Cross-cutting Services & Infrastructure

## Overview
- Duration: 3–4 weeks (completed).
- Team: 2 Flutter devs, 1 Supabase dev, QA partner for contract testing.
- Goal: port shared services from the Expo app (auth/session, push, location, realtime data flows, RPC wrappers) and ensure the Flutter shell mirrors production behavior before vertical feature work begins.

## Deliverables
1. **Auth & User-Type Gating**
   - `app_services/src/auth/auth_controller.dart` recreates `AuthContext` logic: session hydration, metadata fallback to `users.user_type`, signup/signin helpers, and role-aware redirects.
   - Riverpod `ChangeNotifier` exposes `AppAuthState` for gating `go_router`. Roles map to default routes and admin-only protections.

2. **Push Registration Replacement**
   - `PushRegistrationService` swaps Expo push tokens for `firebase_messaging` tokens with platform detection and Supabase `push_tokens` upsert. Invoked on login/role changes.

3. **Location Services & Driver Tracking**
   - `LocationController` mirrors `LocationContext`: permission prompting (`geolocator` + `permission_handler`), GPS refresh, default address loading, and `set_default_address` RPC calls.
   - `DriverLocationTracker` provides start/stop APIs akin to `useDriverLocationTracking`, wiring live coordinates back to Supabase.

4. **Realtime Order/Delivery Sources**
   - `RealtimeOrdersService` replicates `useRealtimeOrders` queries and channel syncing; `RealtimeDeliveriesService` mirrors driver + available delivery watchers.
   - Streams are exposed via Riverpod to feed future UI modules.

5. **RPC Abstractions & Tests**
   - `OrdersRepository` translates typed Dart requests into Supabase RPC payloads (e.g., `create_order_payment_pending`).
   - Contract-style test (`orders_repository_test.dart`) asserts payload parity; staging Supabase integration tests can extend this harness per risk mitigation plan.

6. **App Integration**
   - `talabat_app` now uses the shared services: role-aware routing, customer home location tile, and dependencies added in `pubspec.yaml`.

## Risks & Mitigation Follow-up
- **Realtime Drift**: Services centralize channel handling; QA can bolt additional tests referencing staging data to guarantee parity.
- **Location/Push Permissions**: Controllers surface error states and fall back to prompting `openAppSettings()` when denied forever, satisfying platform guidelines.
- **RPC Contract Changes**: Repositories encapsulate payload mapping, making it easier to add integration tests/telemetry for Supabase responses.

## Next Steps
- Plug persona modules (customer checkout, restaurant dashboards, delivery flows) into the new services.
- Expand repository coverage (wallets, payouts, driver ops) and extend test harness to cover additional RPCs.
- Begin implementing Phase 3 (Customer Experience Vertical) atop these shared services.
