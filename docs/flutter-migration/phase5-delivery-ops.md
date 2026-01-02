# Phase 5 – Delivery & Operations

## Overview
- Duration: 4–5 weeks (completed).
- Goal: port the courier experience (navigation, live tracking, cash reconciliation, incident logging) and ops tooling (delay credits, reroute hooks) to Flutter, leveraging the shared Supabase services built earlier.

## Deliverables
1. **Delivery Repositories & Models** – `DeliveryRepository` wraps Supabase RPCs (`update_delivery_status_safe`, `settle_driver_cash`, incident inserts) and exposes typed models for active deliveries and cash ledgers.
2. **Driver Location/Navigations** – `DeliveryNavigationPage` surfaces pickup/drop-off info, launches native maps, mutates delivery status, and links to incident reporting, powered by the background-friendly `driverLocationTrackerProvider` introduced earlier.
3. **Cash Reconciliation** – Flutter view replicates Expo’s cash ledger with “Settle cash” actions using the new repository methods.
4. **Incident Logging & Ops hooks** – Delivery incident sheet, plus the shared `orderStatusProvider` retains delay/reroute hooks so Ops tooling can trigger trusted-arrival events from Flutter.

## Risks & Mitigations
- **Background tracking differences**: Driver tracker continues using `geolocator`; native channel hooks will be added during hardening to satisfy iOS/Android policies.
- **Offline routes**: Delivery repository fetches active job data for caching; future work can add `hive` persistence if necessary.

## Next Steps
- Phase 6 hardening (QA, telemetry, dual-run) once delivery + ops flows have completed device testing.
