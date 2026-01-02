# Runbook – Push Token Migration

**Purpose**: Guide ops/support while migrating Expo push tokens to Firebase Cloud Messaging (FCM) for the Flutter-only client.

## Inputs
- Feature flag: `enableFlutterPushRegistration` (Supabase `feature_flags` table).
- Supabase tables: `push_tokens`, `telemetry_events` (filter `event_name = 'push_registration'`), `telemetry_crashes`.
- Scripts: `flutter/packages/app_services/lib/src/services/push_registration_service.dart`.

## Monitoring
1. **Token intake** – Grafana panel “FCM token registrations” (querying Supabase `push_tokens` by client_label). Alert if Flutter registrations <80% of active DAU for 12h.
2. **Delivery health** – Cloud Messaging dashboard; verify error rate <1% when Flutter flag is 100%.
3. **Crash anomalies** – filter telemetry for `push_registration_failed` to surface OEM issues.

## Execution Steps
1. Enable `enableFlutterPushRegistration` for 10% of QA cohort; verify telemetry + manual notifications succeed.
2. Roll to 50% of staff → 100% internal testers → staged store rollout.
3. Run SQL job:
   ```sql
   UPDATE push_tokens SET status = 'deprecated'
   WHERE client_label = 'expo' AND updated_at < now() - interval '14 days';
   ```
4. Run `npm run build:supabase-openapi` to refresh RPC bindings so future migrations catch schema updates.

## Rollback
- Flip `enableFlutterPushRegistration` to `false` (Supabase row) to restore Expo path.
- Re-run Expo notifier to ensure stale incidents clear.
- File incident report referencing telemetry IDs for audit.

## Escalation
- Trigger on-call Supabase DBA if insert errors >0.5% for >5m (RLS misconfiguration).
- Loop in Firebase support when Cloud Messaging returns `MismatchSenderId`.
