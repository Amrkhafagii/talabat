# Restaurant App – Phase 1 Discovery & Design Lock

Notes extracted from the provided restaurant mocks (Dashboard, Orders, Menu, Wallet, Performance). These values are the target reference for Phase 2 theming and component rebuild. Font family is Inter (already bundled); weights and sizes below assume Inter Regular/SemiBold/Bold.

## Palette
- Primary / CTA: `theme.colors.primary[500]` (hero orange across CTAs, active tabs, nav highlight) with strong/pressed at `theme.colors.primary[600]`.
- Primary soft: `theme.colors.primary[100]` (pills, soft backgrounds, subtle dividers).
- Background: `theme.colors.background` (page background behind cards/lists).
- Surface: `theme.colors.surface`; Surface alt: `theme.colors.surfaceAlt`; Border: `theme.colors.border`.
- Text strong: `theme.colors.text`; Text muted: `theme.colors.textMuted`; Text subtle/placeholder: `theme.colors.textSubtle` / `theme.colors.formPlaceholder`.
- Success: `theme.colors.status.success` (wallet credits, online chip dot); Warning/On-hold: `theme.colors.status.warning`; Info (in-progress): `theme.colors.status.info`.
- Soft fills: success `theme.colors.statusSoft.success`; warning/on-hold `theme.colors.statusSoft.warning`; info `theme.colors.statusSoft.info`; use `theme.colors.pill` for neutral gray pills.

## Typography
- Title XL: 28 / 34, Bold (e.g., big currency on wallet)
- Title L: 24 / 30, Bold (screen titles like “Orders”, “Dashboard”)
- Title M: 20 / 26, Bold (card section headers, order numbers)
- Subhead: 16 / 22, SemiBold (labels in cards)
- Body: 16 / 22, Regular (descriptions, list rows)
- Caption: 14 / 20, Medium (chip labels, pill tabs, meta text)
- Button: 16 / 20, Bold; Button Small: 14 / 18, Bold

## Spacing & sizing
- Scale: 4, 8, 12, 16, 20, 24, 32
- Page padding: 16 (mobile phones); list bottom inset: 24 + safe area
- Card padding: 16; gap between cards: 16
- CTA height: 52 with 20 radius; small CTA height: 44 with 16 radius
- Pill/segmented control height: 44; horizontal padding 18
- Chip height: 28–30 with 14 radius
- List row vertical padding: 12–14

## Radius
- Cards: 18
- CTA primary/secondary: 20
- Pills/segmented controls: 22
- Icon pills (quick actions): 16 radius on 32x32 pill
- Floating action (menu add): 24 radius on 56x56

## Shadows (mobile-friendly)
- Card: shadow opacity ~0.08, radius 10–12, offset (0, 6); Android elevation 6
- Raised/FAB: opacity ~0.14, radius 14–16, offset (0, 8); Android elevation 10
Use consistent shadow tokens so cards and pills read softly on both iOS/Android.

## Icon sizes
- Tab bar icons: 22–24
- Header icons: 20
- Quick action glyphs: 18 inside 32 pill
- List row leading icons: 20–22

## Component specs
- Header bar: centered title, left back button when applicable; right notification icon; height ~56 + safe area; background `theme.colors.surface`; hairline bottom border `theme.colors.border`.
- Segmented tabs (Active/Past, All/Earnings/Payouts, filters): soft gray background `theme.colors.surfaceAlt`, pills radius 22; active pill fill `theme.colors.primary[500]` with `theme.colors.textInverse`; inactive text `theme.colors.textMuted`.
- Cards (orders, stats, wallet balance, alerts): `theme.colors.surface`, 18 radius, 1px border `theme.colors.border`, light card shadow. Internal dividers: 1px `theme.colors.border`.
- Status chips: pill radius 14, height ~28; NEW uses `theme.colors.primary[100]` bg + `theme.colors.primary[500]` text; IN PROGRESS uses `theme.colors.statusSoft.info` + `theme.colors.status.info`; PAYMENT HOLD uses `theme.colors.statusSoft.warning` + `theme.colors.status.warning`; Paid/Pending chips use `theme.colors.status.success` / `theme.colors.status.warning` with matching soft fills.
- Buttons:
  - Primary: `theme.colors.primary[500]` fill, `theme.colors.textInverse`, 20 radius, 52 height.
  - Secondary ghost (reject): `theme.colors.statusSoft.error` fill, `theme.colors.status.error` text, 20 radius, 52 height.
  - Tertiary/outline (wallet “Complete Now” ghost): `theme.colors.primary[500]` outline/text on `theme.colors.primary[100]`.
- Toggle: track `theme.colors.primary[500]` when on, `theme.colors.borderMuted` when off; knob uses surface + subtle shadow.
- List rows (recent orders, wallet history): `theme.colors.surface` card with 18 radius, horizontal padding 16, vertical padding 14; status text uses status tokens; leading icon circles use `theme.colors.statusSoft.*` fills.
- Search bar (menu): 44 height, radius 12–14, background `theme.colors.surfaceAlt`, icon `theme.colors.textSubtle`, placeholder `theme.colors.formPlaceholder`.
- FAB (menu add): 56x56, `theme.colors.primary[500]` fill, `theme.colors.textInverse`, raised shadow.

## Navigation
- Bottom tab bar: `theme.colors.surface`, subtle top border `theme.colors.border`, height ~72 including safe area; active tint `theme.colors.primary[500]`, inactive `theme.colors.textMuted`; labels 12, SemiBold; icons 22–24.
- Stack headers (wallet/performance detail): title centered; back chevron on left; optional help icon on right (wallet).

## Device responsiveness
- Safe-area aware top/bottom padding; keep 16px horizontal padding on narrow devices (≤380px width).
- Cards and pills should stretch full width; avoid fixed widths.
- Tap targets min 44px height; hit slop 12 around small icons.

## Design risks/assumptions
- Exact hex values derived from mocks; adjust with live color sampling in Phase 2 if we import assets.
- Shadows tuned for readability without heavy elevation; verify on Android dark text over pale backgrounds.
- Icon set can stay Lucide if stroke weight matches; swap to custom SVG if stroke feels heavier than mocks.
