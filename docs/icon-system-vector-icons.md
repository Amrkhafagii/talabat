# Icon System – Platform Native (Phase 2)

- **Families (locked):** iOS renders `Ionicons`, Android renders `MaterialIcons`. The shared registry lives in `components/ui/Icon.tsx`; avoid importing icon packs directly.
- **Platform fit:** icons default to `theme.iconSizes` with automatic platform offsets (iOS -1pt, Android +1pt) for more native proportions. New `StarOutline` mapping covers rating states without manual family overrides.
- **Color rules:** defaults are platform-aware (`text` on iOS, `secondaryText` on Android) with status colors from `theme.colors.status.*`. Pass explicit colors for CTAs or inverse surfaces; otherwise the registry picks sensible tones per platform.
- **Touch feedback:** `IconButton` now uses `TouchableOpacity` (`activeOpacity 0.7`) on iOS and `TouchableNativeFeedback` ripple on Android with the app overlay tint. Keep hit targets ≥44px via `theme.tap.hitSlop`.
- **Mapping policy:** each semantic name maps to Ionicons/MaterialIcons counterparts with a single fallback (`help-circle-outline`/`help-outline`). Add new names to the registry rather than passing raw glyph strings so platforms stay in sync.

## Phased rollout
1) **Infrastructure (done):** platform-aware registry + IconButton native feedback; Feather/MaterialCommunityIcons removed from the shared component.
2) **Migration:** replace any remaining direct `@expo/vector-icons` imports or `family` overrides with registry names; align dynamic cases (ratings, tabs) to `Star`/`StarOutline` etc.; verify sizes/colors on both platforms.
3) **Hardening:** snapshot key screens on iOS/Android, fix any missing mappings, and document any bespoke icons. Drop unused icon dependencies when confirmed.
