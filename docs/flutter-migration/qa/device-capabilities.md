# Device Capability QA Matrix – Phase 8

Owners: Device lab (Aya), Flutter QA pairing (Mostafa), Ops rep (Lobna)  
Targets: iOS 18.1 (iPhone 15 Pro), Android 15 (Pixel 8 Pro)  

| Capability | Platform Configuration | QA Procedure |
| --- | --- | --- |
| **Camera / Media Upload** | iOS: `NSCameraUsageDescription` updated with Talabat justification; Android: `<uses-feature android:name="android.hardware.camera" />` plus scoped storage permission. | 1. Launch customer checkout, tap “Upload proof” → permission prompt must include copy from ADR. 2. Capture photo, confirm preview + Supabase upload success toast. 3. Revoke permission in system settings, relaunch, ensure graceful fallback. |
| **Document Picker** | Added `NSDocumentsFolderUsageDescription` and Android SAF intent filters. | Within admin reviews, attach PDF evidence; verify MIME detection and Supabase storage metadata. |
| **Background Location** | iOS: `UIBackgroundModes` includes `location`; Android: `ACCESS_BACKGROUND_LOCATION` gated by manifest placeholder. | Run delivery app, toggle “Stay online” then lock device for 5 minutes; confirm Supabase driver beacon updates in telemetry dashboard. |
| **Push Notifications** | Firebase Messaging auto-started in `AppBootstrap`; APNS/FCM keys rotated per ops runbook. | Trigger push via staging Supabase function; receive token log in telemetry tables and end-to-end notification alert. |
| **Haptics** | `HapticFeedback.lightImpact` behind feature flag when device supports it. | Toggle incidents/payout confirmations to ensure haptic call occurs only once per action (validated via simulator debug logs). |
| **WebView** | `webview_flutter` 4.x embedded for admin exports + review UI; `NSAppTransportSecurity` allows permitted domains only. | Load admin photo review, open image, ensure zoom/pinch works and restricted domains fail gracefully. |
| **Gradients & Theming** | `TalabatGradientBackground` uses shader warmup on Android 14+; fallback static colors for accessibility toggles. | Compare gradient renders vs. Expo screenshots; run WCAG contrast check (≥4.5:1). |
| **Deep Links** | `ios/Runner/Info.plist` + `android/app/src/main/AndroidManifest.xml` updated with `talabat://` + HTTPS association for orders. | Use `xcrun simctl openurl` / `adb shell am start -W -a android.intent.action.VIEW` to open `talabat://order/ORDER_ID`; verify router navigates to order detail and analytics logs `deep_link_opened`. |

## Sign-off Checklist
1. Capture screen recordings for every row (stored under `docs/flutter-migration/qa/artifacts/phase8/`).
2. Log device/OS/build numbers in QA sheet.
3. File bugs in Linear if behaviour deviates; attach telemetry IDs or Supabase row IDs.
