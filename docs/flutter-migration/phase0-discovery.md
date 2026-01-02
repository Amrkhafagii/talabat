# Phase 0 – Discovery & Migration Readiness

Time frame: 2 weeks  
Team: Tech Lead (shared), 1 Senior Flutter Engineer, 1 Supabase/Backend Engineer, 1 Product Designer.  
Scope: establish a complete understanding of today’s Expo app, translate it into a Flutter-first plan, and de-risk hidden flows before implementation.

---

## 1. Feature Inventory

| Persona / Surface | Screens & Modules | Notes |
| --- | --- | --- |
| **Shared shell & auth** | `app/_layout.tsx`, `app/(auth)/login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `contexts/AuthContext.tsx`, `styles/appTheme.tsx` | Root stack hosts auth, tabs, admin; providers handle auth/session, location, cart, theming, fonts and splash hiding. |
| **Customer** | `app/(tabs)/customer/index.tsx`, `cart.tsx`, `orders.tsx`, `track-order.tsx`, `restaurant.tsx`, `filters.tsx`, `addresses.tsx`, `add-address.tsx`, `edit-address.tsx`, `select-address.tsx`, `profile.tsx`, `edit-profile.tsx`, `wallet.tsx`, `payment-proof.tsx` | Covers discovery, favorites, filters, ETA display, checkout/cart, address book with GPS autofill, Instapay wallet, proof uploads, order tracking with Supabase realtime and push alerts. |
| **Restaurant** | `app/(tabs)/restaurant/index.tsx`, `menu.tsx`, `menu-item/*`, `add-menu-item.tsx`, `edit-menu-item.tsx`, `orders.tsx`, `order-detail/[orderId].tsx`, `performance.tsx`, `metrics.tsx`, `category-manager.tsx`, `settings.tsx`, `wallet.tsx`, `payout-confirm.tsx`, `kyc/*` | Manage menus/media, categories, incoming orders, SLA metrics, payouts & Instapay, onboarding/KYC wizard, and settings (including GPS pin drop). |
| **Delivery** | `app/(tabs)/delivery/index.tsx`, `navigation.tsx`, `location.tsx`, `cash-reconciliation.tsx`, `earnings.tsx`, `history.tsx`, `wallet.tsx`, `payout-confirm.tsx`, `cancel.tsx`, `issue-report.tsx`, `feedback.tsx`, `profile.tsx` | Driver availability, geolocation and navigation, delivery lifecycle, cash settlement, payouts, cancellations, feedback, incident reporting. |
| **Admin** | `app/admin/_layout.tsx`, `metrics.tsx`, `analytics.tsx`, `orders.tsx`, `payouts.tsx`, `reviews.tsx`, `settings.tsx` | Internal console for KPIs, queues, payouts, menu/photo approvals, settings, and audits; gated via `useAdminGate`. |
| **Cross-cutting services** | `hooks/useRealtimeOrders.ts`, `hooks/useTrackOrder.ts`, `hooks/useDriverLocationTracking.ts`, `hooks/useDeliveryNavigation.ts`, `hooks/usePushRegistration.ts`, `utils/db/*`, `contexts/LocationContext.tsx`, `contexts/CartContext.tsx` | Provide realtime Supabase channels, ETA computation, driver tracking, database RPC accessors, push token registration, GPS + cart persistence. |

Hidden-flow audit mitigation: stakeholder workshops per persona plus a route-by-route checklist (covering `app/(tabs)` subtrees, admin stack, and modal-only screens such as `payment-proof` or `payout-confirm`).

---

## 2. Supabase RPC Catalogue

All RPCs referenced in the codebase must be re-implemented via `supabase_flutter` clients. Each entry lists purpose and call sites.

| RPC | Purpose | Primary Call Sites |
| --- | --- | --- |
| `admin_driver_profit` | Driver profit analytics for admin dashboards | `utils/db/admin/analytics.ts` |
| `admin_kpi_overview` | Live operations KPIs | `utils/db/admin/ops.ts` |
| `admin_queue_counts` | Queue depth for ops console | `utils/db/admin/ops.ts` |
| `admin_restaurant_profit` | Restaurant profit analytics | `utils/db/admin/analytics.ts` |
| `admin_totals` | Aggregate paid totals / fees | `utils/db/admin/analytics.ts` |
| `apply_trusted_kill_switch` | Toggle trusted-arrival metrics | `utils/db/metrics.ts` |
| `approve_payment_review` / `reject_payment_review` | Admin resolution of manual payment reviews | `utils/db/admin/payments.ts` |
| `capture_order_payment` / `hold_order_payment` / `release_order_payment` / `refund_order_payment` / `payout_driver_delivery` / `settle_driver_cash` / `submit_wallet_topup_proof` / `get_wallet_balances` | Wallet operations & payouts | `utils/db/wallets.ts` |
| `create_order_payment_pending` | Atomic order creation | `utils/db/orders.ts`, `tests/contract/rpcs.test.mjs` |
| `daily_settlement_report`, `list_aging_payables` | Finance reporting exports | `utils/db/admin/reports.ts` |
| `driver_claim_delivery`, `update_delivery_status_safe` | Driver workflow state | `hooks/useRealtimeDeliveries.ts`, `utils/db/deliveries.ts` |
| `enqueue_order_refund` | Customer refund queueing | `hooks/useRealtimeOrders.ts`, `hooks/useTrackOrder.ts` |
| `finalize_driver_payout`, `initiate_driver_payout` | Driver payout lifecycle | `utils/db/admin/payments.ts`, tests |
| `finalize_restaurant_payout`, `initiate_restaurant_payout` | Restaurant payout lifecycle | `utils/db/admin/payments.ts`, tests |
| `get_admin_settings` / `set_admin_settings` | Feature flags + settings | `utils/db/admin/settings.ts` |
| `get_kyc_status` | Restaurant KYC state | `utils/db/kyc.ts` |
| `get_ops_alerts_snapshot`, `get_ops_playbook` | Ops alerts and SOPs | `utils/db/admin/ops.ts` |
| `get_order_admin_detail`, `list_order_state_issues`, `list_delivery_state_issues` | Admin troubleshooting | `utils/db/admin/orders.ts` |
| `get_push_tokens_for_users` | Multi-user push fan-out | `utils/db/pushTokens.ts` |
| `get_restaurant_dashboard`, `get_trusted_arrivals` | Restaurant analytics | `utils/db/dashboard.ts` |
| `get_user_address_coords` | Reverse geocode stored addresses | `utils/db/deliveries.ts` |
| `hold_order_payment`, `capture_order_payment`, `release_order_payment`, `refund_order_payment` | Order escrow lifecycle | `utils/db/wallets.ts` |
| `list_driver_license_reviews`, `review_driver_license` | Driver license KYC review | `utils/db/admin/driverLicenses.ts` |
| `list_driver_payables`, `list_restaurant_payables`, `list_restaurant_payment_visibility`, `list_driver_payout_visibility`, `list_payment_review_queue`, `list_wallet_transactions_for_user`, `list_payout_balances` | Finance/admin visibility APIs | `utils/db/admin/payments.ts`, `utils/db/admin/wallet.ts` |
| `list_menu_photo_reviews`, `review_menu_photo` | Menu media moderation | `utils/db/admin/menuPhotos.ts` |
| `populate_metrics_trusted_arrival` | Backfill ETA metrics | `utils/db/metrics.ts` |
| `reconcile_settlement_import`, `settle_wallet_balance` | Finance reconciliation | `utils/db/admin/wallet.ts` |
| `reroute_order_rpc` | Order rerouting | `utils/db/reroute.ts`, tests |
| `set_default_address` | Customer default address | `utils/db/addresses.ts` |
| `set_order_eta_from_components` | Persist trusted ETA components | `utils/db/orders.ts` |
| `submit_payment_proof` | Manual payment proof uploads | `utils/db/orders.ts`, `utils/db/admin/payments.ts`, tests |
| `update_delivery_status_safe` | Delivery status guard | `utils/db/deliveries.ts` |
| `validate_substitution_choice` | Menu substitution validation | `utils/db/orders.ts` |

Action: generate an OpenAPI spec from Supabase and use it to auto-generate Dart clients so this list stays authoritative.

---

## 3. Device & Native Capability Inventory

| Capability | Source (Expo / RN module) | Migration Notes / Flutter Equivalent |
| --- | --- | --- |
| Foreground & background location | `expo-location`; iOS `UIBackgroundModes: ["location"]`, Android `ACCESS_*_LOCATION` (`app.json`) | Use `geolocator` + `background_locator_2` (or `flutter_background_geolocation`) and define Info.plist / Android permission strings; mirror existing throttling in `hooks/useDriverLocationTracking.ts`. |
| Camera capture | `expo-camera` (`app/(tabs)/customer/payment-proof.tsx`, restaurant menu item forms, wallet KYC) | Adopt `image_picker` or `camera` plugin with native permission prompts; wire compression logic similar to Expo configuration. |
| Media/document picker | `expo-document-picker`, `expo-image-picker` | Use `file_picker` / `image_picker`; preserve MIME validation from payment proof flow. |
| Push notifications | `expo-notifications`, Expo push tokens via `usePushRegistration.ts` | Move to Firebase Cloud Messaging using `firebase_messaging` + vendor for APNs/FCM tokens; create backend endpoint to store tokens (adapt existing `upsertPushToken`). |
| Clipboard & haptics | `expo-clipboard`, `expo-haptics` | Use `flutter/services` `Clipboard` & `HapticFeedback`. |
| Splash & fonts | `expo-splash-screen`, `expo-font` with Inter family | Configure Flutter native splash + `google_fonts` for Inter weights. |
| Web browser / deep links | `expo-linking`, `expo-web-browser` | Use `uni_links` / `url_launcher`. |
| Image blur/gradients | `expo-blur`, `expo-linear-gradient` | Use `BackdropFilter` / `shimmer` packages and `Gradient` widgets. |
| Safe area & status bar | `react-native-safe-area-context`, `expo-status-bar` | Flutter `SafeArea`, `AnnotatedRegion<SystemUiOverlayStyle>`. |
| WebView | `react-native-webview` | Replace with `webview_flutter` where necessary (admin or payment flows). |
| SVG/Iconography | `react-native-svg`, `@expo/vector-icons` | Use `flutter_svg` + custom icon font or `IconData` mapping. |

Catalog maintained in `docs/flutter-migration/device-capabilities.md` once Phase 1 begins; for now this table seeds plug-in evaluation.

---

## 4. Flutter Architecture Blueprint

1. **Navigation topology**
   - Use `go_router` with three nested `ShellRoute`s mirroring Expo tabs: customer, restaurant, delivery.  
   - Admin console resides in a standalone branch accessible after `useAdminGate` equivalent verifies `user_type === admin`.  
   - Auth stack becomes an `AuthenticationShell` with guarded redirect logic replicating `app/(tabs)/_layout.tsx`.

2. **State management**
   - Adopt `Riverpod` (generator-backed) for global providers: `authProvider`, `locationProvider`, `cartProvider`, `themeProvider`.  
   - Compose `StateNotifier`s for complex flows (orders, driver navigation) and `StreamProvider`s for Supabase realtime channels.

3. **Platform services**
   - Supabase: use `supabase_flutter` with typed repositories (`ordersRepository`, `walletRepository`, etc.) generated from OpenAPI definitions derived in §2.  
   - Background location & push: wrap plugin APIs inside `Service` classes consumed via Riverpod; ensure isolates can update Supabase via REST fallback.

4. **Presentation & design system**
   - Convert `styles/appTheme.tsx` tokens into a Flutter `ThemeExtension` named `TalabatTheme`. Provide responsive helpers for spacing, typography, density detection akin to `useResponsiveDevice`.  
   - Each persona-specific module (customer/delivery/restaurant/admin) lives in `packages/customer_app`, etc., sharing a `ui_kit` package for buttons, tabs, skeletons, icons.

5. **Data/domain boundaries**
   - Layering: UI → ViewModels (Riverpod Notifiers) → Repositories (Supabase RPC wrappers) → `SupabaseClient`.  
   - Use sealed classes for result states (loading/success/error) to replace ad-hoc loading flags.

Diagram (textual):
```
MaterialApp
└── GoRouter shell (ThemeProvider)
    ├── AuthShell (login/signup/reset)
    ├── TabsShell (customer/restaurant/delivery) -> persona routers
    └── AdminStack
Providers: AuthProvider → LocationProvider → CartProvider → DeviceServices
```

---

## 5. Design Token Translation (from `styles/appTheme.tsx`)

| Token Group | React Native Definition | Flutter Translation Plan |
| --- | --- | --- |
| Colors | `lightPalette` / `darkPalette` with `primaryRamp`, status colors, overlay | Create `TalabatColorTheme` `ThemeExtension` exposing ramps (`primary25/50/100/500/600`) plus `status.success` etc.; feed into `ColorScheme` for Material 3 widgets. |
| Spacing | `baseSpacing` (`xxs`…`xl2`) + `sp()` responsive helper | Provide const spacing map + `Spacing.of(context).md` with responsive adjustments via `MediaQuery`. |
| Radius | `baseRadius` (sm=12, md=16, etc.) | Map to `BorderRadius` helpers; define `Radii.card`, `Radii.cta`. |
| Typography | `titleXl`, `titleL`, `titleM`, `body`, `subhead`, `caption`, `button`, `buttonSmall` referencing Inter weights | Build `TextTheme` override using `GoogleFonts.inter` and store line heights; ensure `FontFeature` for `title` styles. |
| Shadows | `buildShadows` generating `card` + `raised` | Implement `TalabatElevation` with `BoxShadow` lists for `Card`/`Raised`. |
| Icon sizes & stroke | `baseIconSizes`, `icons.strokeWidth` | Set `IconThemeData` + custom vector icon widget. |
| Interaction (`tap`) | `minHeight`, `hitSlop` | Use `ButtonStyle` / `InkWell` `minimumSize`, `EdgeInsets` plus `GestureDetector` `behavior`. |
| Responsive helpers | `useResponsiveDevice`, `wp`, `hp`, `rf`, `sp` | Provide `ResponsiveLayout` service or extension to compute percentages (via `MediaQuery.size`). |

Deliverable: create a Figma → Flutter token mapping and unit tests verifying parity for critical values (colors, spacing).

---

## 6. Technical Decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Navigation | `go_router` with nested shells + typed routes | Mirrors Expo Router’s nested stacks while enabling declarative redirects and deep link support. |
| State management | Riverpod (codegen) + Freezed models | Provides compile-time safety for providers currently implemented via Contexts/Hooks. |
| Push provider | Firebase Cloud Messaging + custom token upsert endpoint | Expo push tokens are incompatible with Flutter; FCM supports both Android & iOS and integrates with Supabase functions. |
| Supabase integration | `supabase_flutter` + generated repositories from OpenAPI spec | Ensures parity with existing RPC-heavy JS layer and simplifies testing. |
| Background services | `geolocator` + `background_locator_2` (drivers) and `workmanager` for periodic syncs | Replaces Expo foreground/background location watchers with configurable native tasks. |
| CI/CD | GitHub Actions running `flutter analyze`, `flutter test`, `melos run verify`; packaging via `fastlane` triggered per branch; integrate with existing `diagnose` pipeline | Keeps parity with current lint/test workflow while enabling build artifacts for iOS/Android. |
| Release tracks | Adopt staged rollout: internal → QA (Firebase App Distribution/TestFlight) → beta → production; keep Expo app as control until Flutter KPIs meet thresholds | Allows phased cutover and quick rollback. |

---

## 7. Resource Allocation & Collaboration Plan

| Role | Responsibilities during Phase 0 | Hours (approx.) |
| --- | --- | --- |
| Tech Lead | Coordinate workshops, own architecture blueprint & decision log | 30 h |
| Senior Flutter Engineer | Audit UI/features, propose navigation/state/push solutions | 40 h |
| Supabase/Backend Engineer | Produce RPC catalogue, confirm contract coverage, plan new endpoints (push tokens, background jobs) | 32 h |
| Product Designer | Translate design tokens, validate UI inventory, prep Figma for Flutter components | 24 h |

Collaboration rituals: kick-off workshop, persona-focused deep dives, daily async status, architecture review at end of week two.

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Hidden flows (Instapay gating, modal screens, admin edge cases) | Missing functionality in Flutter release | Stakeholder workshops + route checklist covering all files under `app/(tabs)` and `app/admin`; maintain traceability matrix between React screens and Flutter backlog items. |
| Supabase contract drift during migration | Runtime errors or inconsistent data | Freeze RPC schema after catalogue, auto-generate Dart clients, add contract tests mirroring `tests/contract/rpcs.test.mjs`. |
| Device capability gaps (background location, push) | App store rejection or degraded UX | Engage native specialists early, document Info.plist/Android permission requirements, run PoCs during Phase 1. |
| Design token mismatches | Visual regressions causing QA churn | Lock tokens in shared JSON, add Flutter golden tests, review with design before development sprints. |

---

## 9. Next Actions

1. Approve this Phase 0 package and circulate among stakeholders.  
2. Generate Supabase OpenAPI contract + Dart clients (Supabase engineer).  
3. Stand up Flutter monorepo skeleton with token + provider scaffolding (Flutter engineer) — kicks off Phase 1.  
4. Schedule persona workshops and create the route traceability spreadsheet referenced above.  
5. Define KPI baselines (orders per persona, driver SLA, payout latency) to monitor during dual-run.

