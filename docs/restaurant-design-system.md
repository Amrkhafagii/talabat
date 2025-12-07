## Restaurant Design System (Delivery Console)

Tokens live in `styles/deliveryTokens.ts` and are applied via `styles/restaurantTheme.tsx`. The theme scales with `useWindowDimensions` (compact ≤380px, tablet ≥768px) and safe-area insets.

### Color Palette
- Accent: `accent` (primary orange), soft pill: `accentSoft`, background/surface/surfaceAlt, border/borderMuted.
- Text: `text`, `secondaryText`, `textMuted`.
- Status: `status.success` (`#22C55E`), `status.warning` (`#FBBF24`), `status.error` (`#F87171`), `status.info` (`#2563EB`), `status.hold` = warning.

### Spacing & Radius
- Spacing scale: `xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 20`, `xl2 24` (scaled per device density).
- Radii: `sm 6`, `md 10`, `lg 14`, `xl 18`, `pill 999`, `cta 14` (scaled per density).

### Typography (Inter)
- Titles: `titleXl 28/34`, `titleL 24/30`, `titleM 20/26`.
- Body/Subhead: `body 16/22`, `subhead 16/22` (semibold), `caption 14/20`.
- Buttons: `button 16/20 bold`, `buttonSmall 14/18 bold`.

### Shadows
- `shadows.card`: mid elevation for cards/lists; `shadows.raised`: higher elevation for CTAs/FABs. Both re-derived per platform for iOS/Android parity.

### Tap & Insets
- Minimum touch height `tap.minHeight = 44`, `tap.hitSlop = 12` each side.
- Use `theme.insets` for bottom padding on scrolls/FABs and `contentInsetAdjustmentBehavior="automatic"` on ScrollView/FlatList.

### Core Components (restaurant)
- Buttons: `components/ui/Button` (`primary`, `secondary`, `outline`, `ghost`, `danger`; sizes `small|medium|large`; `pill`/`fullWidth`).
- Chips/Pills: `components/ui/Chip`, `PillTabs`, `SegmentedControl`.
- List surfaces: cards use `theme.radius.card/xl`, `shadows.card`, `border`.
- Inputs: `SearchBar`, `LabeledInput`, `FormField`/`FormSelect`/`FormToggle`.
- Badges: `components/ui/Badge` + status tokens (`styles/statusTokens.ts`).
- Tabs/Navigation: bottom tabs styled in `(tabs)/restaurant/_layout.tsx`; headers via `ScreenHeader`/`Header`.
- Floating: `FAB` (uses raised shadow, accent pill).
- Skeletons: `components/restaurant/Skeletons` (`BlockSkeleton`, `ListSkeleton`) for loading on orders/dashboard/menu/wallet/performance.

### Patterns & Usage
- Spacing decisions: default horizontal `lg`, compact `md`; vertical rhythm uses `md`/`lg`/`xl`.
- RTL: set `writingDirection` where lists/layouts are directional; avoid absolute-ltr assumptions.
- Status chips: derive from `getOrderStatusToken` / `getPaymentStatusToken` to keep consistent labels/colors.
- Order IDs: display `short_code` first, fallback to `order_number` or last 4–6 of UUID.
- Wallet feed: consume `v_wallet_feed` for `direction`/`bucket` and `order_short_code`; filter earnings/payouts via `bucket`.

### Cleanup Guidance
- Prefer new primitives above; avoid legacy pills/badges/buttons from pre-mock styling.
- Centralize colors/spacing/typography in tokens; avoid hard-coded hex/spacing in screens.
- When adding screens, respect safe areas, use `contentInsetAdjustmentBehavior`, and ensure min tap targets.
