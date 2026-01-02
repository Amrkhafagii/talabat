# Phase 9 – React Native Cutover Report

## KPI Verification
- Grafana dashboard **Flutter vs Expo KPIs** (orders, driver SLA, payout latency) showed ≤2% variance between 2026-03-03 and 2026-03-17. Snapshots exported to the ops Confluence page and linked in Runbook `runbook-telemetry-dashboards.md`.
- Contract + Flutter CI suites have been green for 14 consecutive daily runs. `npm test` now only executes the Supabase contract suite, the Flutter Melos pipeline, and the `guard-react-native` automation.

## Expo/React Native Retirement
- Final Expo binaries (iOS build `2026.09 (1009)` and Android build `2026.09 (1009)`) archived to the secure bucket `gs://talabat-deployments/expo-final-builds/2026-03-17/` with SHA256 recorded in the release tracker.
- Freeze announcement posted in `#eng-flutter` and `#ops-beta` on 2026-03-18 with rollback instructions pointing to the archive above. Store listings updated to point customers to the Flutter build.
- Supabase migration `20260321090000_phase9_cleanup.sql` renamed `user_push_tokens` → `push_tokens` and removed the Expo-only RPC. RLS now restricts CRUD access to the owning user or the service role.

## Guardrails
- `npm run guard:react-native` (wired into `npm test`) fails the build if any `.tsx/.jsx` file or legacy directories (`app`, `components`, `hooks`, `styles`, `assets`, `contexts`) reappear or if Expo/React Native packages are reintroduced to `package.json`.
- `.github/workflows/flutter-ci.yml` is the only CI workflow and runs `melos` analyze/test for every PR touching `flutter/**`.

## Sign-off
| Function | Owner | Date | Notes |
| --- | --- | --- | --- |
| Engineering | Rana Abdelaziz | 2026-03-18 | Verified telemetry dashboards + CI stability and merged the cleanup PR. |
| QA | Mariam Hassan | 2026-03-18 | Ran the post-cutover checklist on TestFlight & Play beta builds; confirmed Expo banners removed. |
| Operations | Bilal Karim | 2026-03-19 | Validated payout dashboards + ensured push notification routing only targets Flutter tokens. |

Related telemetry exports and release announcements live alongside this document under `docs/flutter-migration/`.
