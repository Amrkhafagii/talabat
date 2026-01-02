# Runbook – Failure Handling & Rollback

**Purpose**: Provide a deterministic checklist when Flutter-only deployments degrade critical flows (checkout, payouts, incidents).

## Inputs
- Feature flags: `showCustomerBetaBanner`, `enableIncidentReporting`, `enableAdminExports`.
- Supabase migrations: `20260308026000_qahardening.sql` (state monitors), `20250701008000_rls_hardening.sql` (policy rollback template).
- Telemetry: events per runbook above, error traces in `telemetry_crashes`.

## Detection
1. CI failure on widget/integration suites → block rollout, examine artifacts under `flutter_test_logs/`.
2. Runtime anomaly – dashboards show KPI drift, Supabase views `v_order_state_issues` / `v_delivery_state_issues` highlight rows.
3. Support case – reference telemetry IDs, confirm Flutter build version vs. RN fallback.

## Response Steps
1. **Stabilize**
   - Enable beta banner + deep link to RN client if customer flows degrade.
   - Disable `enableAdminExports` to stop finance data duplication.
   - Toggle `enableIncidentReporting` off if offline queue spikes > threshold; ops uses hotline fallback.
2. **Investigate**
   - Pull logs from `AnalyticsService` (prefixed `ANALYTICS:`) for offending route.
   - Run `npm run test:flutter -- --plain-name '<feature>'` locally to reproduce.
   - Check Supabase audit logs for schema mismatches (e.g., missing columns) and compare against OpenAPI spec.
3. **Rollback Criteria**
   - 3+ high-severity incidents in 1 hour or KPI drift >5% triggers rollback to Expo binary + disable Flutter feature flag.
   - Use App Store/Play phased release controls to pause/stall updates; redeploy old version if necessary.
4. **Recovery**
   - Apply hotfix release with failing tests reproduced; re-enable flags gradually (10% → 50% → 100%).
   - Update runbook with root cause + remediation to prevent recurrence.

## Contacts
- On-call Flutter engineer
- Supabase DBA (schema changes/tests)
- QA lead for device/system reproductions
- Ops manager for support comms
