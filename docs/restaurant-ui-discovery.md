# Restaurant App – Phase 1 Discovery & Design Lock

Notes extracted from the provided restaurant mocks (Dashboard, Orders, Menu, Wallet, Performance). These values are the target reference for Phase 2 theming and component rebuild. Font family is Inter (already bundled); weights and sizes below assume Inter Regular/SemiBold/Bold.

## Palette
- Primary / CTA: `#FF6B00` (hero orange across CTAs, active tabs, nav highlight)
- Primary soft: `#FFE8D6` (pills, soft backgrounds, subtle dividers)
- Background: `#F7F7F7` (page background behind cards/lists)
- Surface: `#FFFFFF` (cards, inputs, nav bar)
- Border: `#E7E7E7` (card outlines, dividers, pill outlines)
- Text strong: `#2B2B2B`
- Text muted: `#707070`
- Text subtle/placeholder: `#9A9A9A`
- Success: `#16A34A` (wallet credits, online chip dot)
- Warning/On-hold: `#F97373` (payment hold chip, reject button text)
- Info (in-progress): `#4B88FF` (orders “In Progress” chip)
- Light green fill: `#E9F7EE` (earnings row icon bg)
- Light orange fill: `#FFEDE2` (payout row icon bg, soft alerts)

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
- Header bar: centered title, left back button when applicable; right notification icon; height ~56 + safe area; background surface white; hairline bottom border `#E7E7E7`.
- Segmented tabs (Active/Past, All/Earnings/Payouts, filters): soft gray background `#F0F0F0`, pills radius 22; active pill orange fill `#FF6B00` with white text; inactive text `#707070`.
- Cards (orders, stats, wallet balance, alerts): white surface, 18 radius, 1px border `#E7E7E7`, card shadow (light). Internal divider where meta splits header/body: 1px `#E7E7E7`.
- Status chips: pill radius 14, height ~28; NEW uses orange soft bg `#FFE8D6` + orange text; IN PROGRESS uses light blue bg `#E8F0FF` + text `#4B88FF`; PAYMENT HOLD uses light red bg `#FFE5E5` + text `#F97373`; Paid/Pending chips follow success/warning palette.
- Buttons:
  - Primary: orange fill `#FF6B00`, white text, 20 radius, 52 height.
  - Secondary ghost (reject): soft red fill `#FFE5E5`, text `#F97373`, 20 radius, 52 height.
  - Tertiary/outline (wallet “Complete Now” ghost): orange outline/text on pale orange bg.
- Toggle: iOS-style switch; track orange when on, light gray `#E0E0E0` when off; knob white with subtle shadow.
- List rows (recent orders, wallet history): white card with 18 radius, horizontal padding 16, vertical padding 14; trailing amount right-aligned; status text colored (blue for In Progress, green for Completed); leading icon circle uses soft tinted bg.
- Search bar (menu): 44 height, radius 12–14, light gray background `#F0F0F0`, left search icon `#9A9A9A`, placeholder `#9A9A9A`.
- FAB (menu add): 56x56, orange fill, white “+”, shadow raised.

## Navigation
- Bottom tab bar: white surface, subtle top border `#E7E7E7`, height ~72 including safe area; active tint orange, inactive `#9A9A9A`; labels 12, SemiBold; icons 22–24.
- Stack headers (wallet/performance detail): title centered; back chevron on left; optional help icon on right (wallet).

## Device responsiveness
- Safe-area aware top/bottom padding; keep 16px horizontal padding on narrow devices (≤380px width).
- Cards and pills should stretch full width; avoid fixed widths.
- Tap targets min 44px height; hit slop 12 around small icons.

## Design risks/assumptions
- Exact hex values derived from mocks; adjust with live color sampling in Phase 2 if we import assets.
- Shadows tuned for readability without heavy elevation; verify on Android dark text over pale backgrounds.
- Icon set can stay Lucide if stroke weight matches; swap to custom SVG if stroke feels heavier than mocks.
