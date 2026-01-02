# Runbook – Telemetry Dashboards

**Purpose**: Ensure Flutter-only traffic remains observable after retiring Expo. Covers dashboards, alerting, and manual verification.

## Dashboards
1. **Checkout Conversion** – Metabase query on `telemetry_events` (`event_name IN ('order_success','order_failure')`) grouped by `client`.
2. **Delivery Incidents** – Grafana panel pointing to `delivery_incidents` table plus telemetry `delivery_incident_submitted` events.
3. **Admin Export Usage** – Panel from `telemetry_events` filtering `admin_export_triggered`; cross-check against Supabase storage writes.

## Alert Thresholds
- Checkout failure >2% for 10 minutes → page engineering.
- Delivery incidents offline queue >15 pending for 5 minutes → trigger support to review connectivity.
- Admin exports >20/min after hours → notify finance (possible automation abuse).

## Verification Flow (each release)
1. Use Firebase App Distribution/TestFlight build.
2. Trigger success/failure events manually:
   - Customer order, wallet payout resubmission.
   - Restaurant payout request.
   - Delivery incident offline/online flush.
   - Admin export attempt while feature flag disabled/enabled.
3. Confirm telemetry row contains `build_number`, `user_id`, `route`, `feature_flag_snapshot`.
4. Paste screenshots into release log referencing dashboard panels + timestamps.

## Troubleshooting
- Event missing: check `app_services` `AnalyticsService` logs; enable verbose logging via `ANALYTICS_DEBUG=1`.
- Duplicate events: inspect Riverpod provider scope for multiple listeners; use `ProviderObserver`.
- Supabase ingestion lag: query `pg_stat_activity` for blocked writes; escalate to DBA if >50 active writes for telemetry schema.
