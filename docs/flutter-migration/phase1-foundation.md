# Phase 1 – Flutter Platform Foundation

## Overview
- Duration: 3 weeks (completed).
- Team: 2 Flutter devs, product designer, tooling engineer.
- Focus: create production-ready scaffolding mirroring Expo architecture, port design tokens, and ensure CI + env handling exist before feature migration.

## Outcomes
1. **Monorepo Structure (`/flutter`)**
   - Managed with Melos (`melos.yaml`) and shared `analysis_options.yaml` enforcing Flutter lints.
   - Packages:
     - `design_system`: color ramps, spacing, typography, Talabat button/card/skeleton components, placeholder icon font.
     - `app_core`: Supabase bootstrap via `supabase_flutter`, env validation, secure storage for auth persistence, global providers.
   - App:
     - `talabat_app`: `go_router` config replicates auth + tabs + admin stacks, Riverpod-managed router, placeholder persona screens.

2. **Design Tokens**
   - `design_system/lib/src/theme/tokens.dart` reimplements `styles/appTheme.tsx` values (primary ramp, status sets, spacing, radius, typography, icon sizes).
   - `TalabatThemeBuilder` converts tokens into `ThemeData` with Material 3.
   - Skeleton + button components ensure early parity and guard against pixel drift.

3. **Routing + State Blueprint**
   - Shell route replicates `(tabs)` composition (customer, restaurant, delivery) with admin stack, plus auth guard derived from Supabase auth stream.
   - Placeholder pages show how persona modules plug in.

4. **Supabase & Env Management**
   - `AppConfig` pulls credentials from Dart defines; `SupabaseManager` seeds secure auth storage using `flutter_secure_storage`.
   - Providers for `SupabaseClient` and auth stream ready for injection.

5. **CI & Tooling**
   - GitHub Actions workflow installs Flutter 3.24, activates Melos, runs `analyze` + `test` across workspace.
   - Tests include theme snapshot + router smoke check to keep scaffolding healthy.

## Risks & Mitigations
- **Pixel drift**: design tokens centralized; add golden tests when screens mature.
- **Env misconfiguration**: `AppConfig.validate()` crashes early if Supabase keys missing.
- **Package sprawl**: Melos scripts keep commands consistent across modules.

## Next Steps
- Begin Phase 2 by implementing cross-cutting services (auth/session wrappers, location, push) atop `app_core`.
- Flesh out persona modules (customer, restaurant, delivery, admin) incrementally, replacing placeholders.
- Add golden tests + storybook-style catalog for `design_system` components.
