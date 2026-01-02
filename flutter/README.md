# Talabat Flutter Workspace

Monorepo skeleton for the Flutter migration. Managed with [Melos](https://melos.invertase.dev/) and structured into shared packages plus multi-persona apps.

## Layout

- `apps/talabat_app` – primary mobile shell containing nav stacks for auth, customer, restaurant, delivery, admin.
- `packages/design_system` – tokens + UI components mirroring the React Native theme.
- `packages/app_core` – shared services (Supabase client bootstrap, environment handling, secure storage helpers).

## Dev commands

```bash
cd flutter
melos bootstrap
melos run analyze
melos run test
```

The root `pubspec.yaml` only exists so `melos` can resolve workspace-wide dev dependencies (lint rules, build_runner, etc.).
