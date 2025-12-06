# Talabat Ops & Marketplace (Expo + Supabase)

This repo contains a multi-role marketplace app built with Expo Router and Supabase. It includes customer, restaurant, and driver surfaces plus an admin console for ops, payouts, and analytics.

## Overview
- **Mobile/web app**: Expo Router (React Native) targeting iOS/Android/Web.
- **Data layer**: Supabase (PostgreSQL) with migrations under `supabase/migrations/`.
- **Admin console**: Pages for overview, reviews/approvals, orders & deliveries, payouts, and analytics.
- **Testing/quality**: TypeScript, linting, contract + smoke tests.

## Project structure
- `app/` – Expo routes. Tabs for customer/restaurant/driver and `/admin/*` for console views.
- `components/` – Shared UI (cards, filters, lists) including admin widgets.
- `hooks/` – Data/view-model hooks (e.g., `useAdminMetricsCoordinator`, `useAdminReports`).
- `utils/db/` – Supabase RPC wrappers for admin ops, payouts, analytics.
- `supabase/migrations/` – SQL migrations and RPC definitions.
- `styles/` – iOS admin theme (`iosTheme.ts`, `adminMetrics.ts`).
- `scripts/` – Utilities (env check, seed admin).
- `tests/` – Contract (`tests/contract`) and smoke (`tests/smoke`) suites.

## Getting started
1. Install dependencies: `npm install`
2. Set environment:
   - Create `.env` with Supabase keys/URL; see `scripts/check-env.js` expectations.
3. Run dev server: `npm run dev` (or `npm run dev:ios` for tunnel)
4. Typecheck: `npm run typecheck`
5. Lint: `npm run lint`
6. Tests: `npm run test` (contract + smoke)
7. Seed an admin user (local/dev): `npm run seed:admin`

## Key admin flows
- **Overview** (`/admin/metrics`): KPI hero, alerts snapshot, approvals/payout backlog, quick navigation.
- **Reviews** (`/admin/reviews`): Payments, driver licenses, menu photos with filters/pagination and action toasts.
- **Orders & Deliveries** (`/admin/orders`): Issue surfaces, filters, order list, and detail drawer.
- **Payouts** (`/admin/payouts`): Wallet balances, restaurant/driver queues, retry/process-due actions.
- **Analytics** (`/admin/analytics`): Date/entity filters, KPI cards, top driver/restaurant profit charts.

## Scripts
- `npm run dev` – Start Expo dev server.
- `npm run build:web` – Export web build.
- `npm run lint` – Lint via Expo config.
- `npm run typecheck` – TypeScript check.
- `npm run test` – Contract + smoke tests.
- `npm run diagnose` – Env check, lint, typecheck, smoke tests.
- `npm run seed:admin` – Seed admin user data.

## Database & migrations
- Supabase RPCs/functions for payments, payouts, reconciliation, and trusted arrival are defined in `supabase/migrations/*.sql`.
- Contract tests (`tests/contract/rpcs.test.mjs`) assert critical RPC behavior.
- Keep migrations idempotent; use `scripts/check-env.js` before applying.

## Notes for contributors
- Use the admin theme tokens instead of hard-coded colors/spacings.
- Keep admin files under ~700 lines; prefer extracting subcomponents for tables/cards/filters.
- When adding new RPC calls, wire them through `utils/db/*` and update relevant hooks/components.
- For accessibility, ensure tap targets are ≥44px and set `accessibilityRole`/`accessibilityState` where appropriate.

## Troubleshooting
- Type errors: `npm run solvetypecheck` to capture output in `typecheck.log`.
- Missing env vars: `npm run check:env`.
- Supabase connectivity: verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`.
