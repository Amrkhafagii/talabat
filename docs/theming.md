## Theming contract (AppTheme)

- Single source of truth: `styles/appTheme.tsx` provides `AppThemeProvider`, `useAppTheme`, and the `useRestaurantTheme` alias (for backwards compatibility). All surfaces should consume tokens from this hook rather than hard-coded colors or local theme files.
- Adapter for legacy iOS tokens: `styles/iosTheme.ts` syncs `iosColors`, `iosSpacing`, `iosRadius`, `iosTypography`, and `iosShadow` from AppTheme on every render. Existing admin/ios components that import these names will stay in sync with light/dark.
- Tokens to use:
  - `theme.colors`: `background`, `surface`, `surfaceAlt`, `border`, `text`, `textMuted`, `textInverse`, `primary` ramp, `accent*`, `status` + `statusSoft`, `pill`.
  - `theme.spacing` / `theme.radius` / `theme.shadows` / `theme.typography` / `theme.iconSizes` / `theme.tap`.
  - Safe area + device info: `theme.insets`, `theme.device`.
- Layout patterns:
  - Wrap screens in `AppThemeProvider` (already wired in `app/_layout.tsx`).
  - For tab bars/layouts, pull colors from `useAppTheme`/`useRestaurantTheme` (e.g., `tabBarStyle.backgroundColor = theme.colors.surface`, `tabBarActiveTintColor = theme.colors.primary[500]`, `tabBarInactiveTintColor = theme.colors.textSubtle`).
  - Avoid module-scope styles that rely on theme if you need live mode switching; memoize styles with the hook value instead.
- Dark mode: `theme.mode` controls palette selection; `theme.statusBarStyle`/`statusBarBackground` should be used for status bar styling. Admin/iOS components follow mode automatically through the adapter.
- Adding components:
  - Prefer `useAppTheme` directly. If you must use legacy admin primitives, keep using `iosColors`/`iosSpacing` etc. (they are synced for you).
  - Don’t introduce new static tokens; extend `AppTheme` if a token is missing so all surfaces inherit the value.
