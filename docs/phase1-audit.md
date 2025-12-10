# Phase 1 – Customer UI Audit & Acceptance Criteria

## Route inventory → target screens
- `app/(tabs)/customer/index.tsx` (home feed) → “Home / Browse” list with hero filters, categories, promoted and restaurant cards (see final home screen with categories and featured cards).
- `app/(tabs)/customer/restaurant.tsx` → “Restaurant detail” with hero image, badges (rating/time/fee), in-menu search, category tabs, item cards, sticky cart bar.
- `app/(tabs)/customer/cart.tsx` → “My Cart” with delivery/pickup toggle, address card + change CTA, sold-out handling chips, payment method pills, proof upload dropzone, fee breakdown, sticky bottom CTA bar.
- `app/(tabs)/customer/orders.tsx` → “Your Orders” list with Active/Past tabs, status chips, error/empty card, retry block.
- `app/(tabs)/customer/track-order.tsx` → “Track Order” detail with status pills, delay alert card, timeline, map snapshot CTA, driver contact chips, delivery details, support actions.
- `app/(tabs)/customer/wallet.tsx` → “My Wallet” with gradient balance card, Top Up / Submit Proof buttons, transaction history list, statuses and icons.
- `app/(tabs)/customer/profile.tsx` → “Profile” with avatar + edit badge, stats row, default address card, account list items with badges, logout block, version footer.
- `app/(tabs)/customer/edit-profile.tsx` → “Edit Profile” form with avatar upload badge, inputs, membership badge, save CTA.
- `app/(tabs)/customer/addresses.tsx` → “My Addresses” list with card actions (⋯), default indicator, toast surface for updates, empty state preview, add-new CTA.
- `app/(tabs)/customer/add-address.tsx` → “Add New Address” with use-current-location banner, permission helper, manual form, zip validation error, tags (Home/Work/Other), default toggle, save CTA.
- `app/(tabs)/customer/edit-address.tsx` → Edit flow mirroring add screen with prefilled data and default toggle.
- `app/(tabs)/customer/select-address.tsx` → “Select Address” picker with search field, current location row, saved addresses with radio selection, add-new dashed box, confirm CTA.
- `app/(tabs)/customer/filters.tsx` → “Filters” with sort pills, cuisine chips, rating radio blocks, delivery fee options, promoted toggle, clear/apply footer.
- Supporting components involved: `components/customer/*` (CategoryCard, RestaurantCard, MenuItem, Cart* sections, OrderCard, TrackOrder*), `components/ui/*` (Button, Header, SearchBar, FormField/FormSelect/FormToggle, Icon, Card), `components/common/RealtimeIndicator`.

## Data/state dependencies & coupling
- Auth/identity: `contexts/AuthContext` provides `user`, `userType`, `loading`, sign-in/out; routes guarded in `app/(tabs)/customer/_layout.tsx`.
- Location: `contexts/LocationContext` supplies `coords`, `selectedAddress`, setter, refreshLocation; auto-loads default address from `getUserAddresses`.
- Cart & ordering: `hooks/useCartData` drives `cart.tsx` (items from `getMenuItemsByIds`, restaurant meta from `getRestaurantById`, addresses via `getUserAddresses`, ETA via `computeEtaBand` + `estimateTravelMinutes`, substitutions via `getAutoApplySubstitution`/`getSubstitutionForItem`, proof upload via `expo-document-picker` storing `receiptUri` locally). Coupled UI state: substitution prompts, receipt uploading/error, placing flag, selected payment, ETA labels.
- Track order: `hooks/useTrackOrder` uses `useRealtimeOrders`, `getDriverById`, `computeEtaBand`, `getBackupCandidates`, `getDeliveryEventsByOrder`, `createDeliveryEvent`, `logAudit`, `supabase` realtime channel. UI coupling: delayReason/creditStatus/backupPlan map to delay card; `etaDetails` drives status card; driver location used for live location block; safety events control status pill text.
- Favorites: `hooks/useFavorites` currently in-memory only; affects `RestaurantCard` heart state.
- Data layer: `utils/database` re-exports `utils/db/*` for restaurants, menu items, orders, addresses, wallets, trusted arrival, etc.; forms call `createUserAddress`, `updateUserAddress`, `getUserAddresses`, `getWalletsByUser`, `getWalletTransactions`, `getRestaurants`, `getCategories`, `getMenuItemsByRestaurant`, etc.
- Theme/responsive: `styles/appTheme.tsx` / `styles/restaurantTheme.tsx` supply colors/spacing/typography/shadows; `styles/responsive.ts` provides `wp/hp/rf/sp` helpers and breakpoints (smallPhone <360w or <680h, tablet >=900 longest).

## Pixel-level acceptance criteria (by screen)
- Global: primary orange CTA buttons with rounded (≈12–20px) corners, warm neutral backgrounds, soft shadows on cards, thin borders in dashed areas, Inter-like typography weights (Bold for headers, SemiBold for CTAs, Regular for body). Use iconography consistent with mockups (outline chevrons, filled pictos). Maintain 16–20px horizontal padding, 12–24px vertical spacing between blocks. Scroll areas must respect safe areas; sticky footers for CTAs where shown.
- Home: header with location selector + filters icon + profile chip; search bar with rounded pill and prefix icon; category chips horizontally scrollable; promoted cards with badge and ETA; restaurant cards with image, rating chip, fee/time text, heart/favorite. Empty/error states with centered copy.
- Restaurant detail: hero image with overlay icons (back/share/search), rating badge, delivery time/fee chips under title, in-menu search bar, tabbed category pills (active filled orange), item cards with thumbnail, price, quantity stepper, sold-out dimming. Sticky bottom cart bar with item count and total; disable when closed.
- Cart: delivery/pickup segmented control; address card with Change CTA; sold-out handling chips; payment method pill buttons with radio indicator; proof upload dropzone (dashed border) showing accepted formats/size; summary list with fees and ETA banner; sticky bottom bar showing total + Place Order CTA; empty state center-aligned.
- Orders list: top tabs Active/Past styled per mock; order cards with status chips (color-coded), arrival time text, action buttons (Track/Reorder); error/empty blocks with dashed outline for retry when applicable.
- Track order: header with realtime dot; top status card with order number, time, big ETA, status pills (“Preparing”, “On Time”), delay alert card in orange, vertical timeline with checkpoints, map preview CTA, driver card with avatar, rating, call/chat buttons, delivery details block, support/receipt buttons. Spacing generous; cards 12–16px radius with shadows.
- Wallet: gradient balance card with large currency text, two primary/secondary action buttons; transactions list with icons, status colors (green success, red failure, grey pending/failed), “See all” link. Pull-to-refresh allowed.
- Profile: centered avatar with camera badge; name/email/phone; stats row with separators; default address card with manage CTA; list items with icons and chevrons; logout pill button; version text footer.
- Edit Profile: avatar changer badge; inputs styled with rounded rectangles, placeholder muted; phone field with call icon; membership badge; save CTA anchored at bottom with safe-area padding.
- Addresses (list): cards with icon, label, address lines, default badge; kebab menu placeholder; toast surface for updates; empty-state dashed preview; add-new CTA button at bottom.
- Add/Edit Address: top use-current-location card with icon and trailing chevron; permission/info banner; manual form with validation (red error for zip length), tags (Home/Work/Other) as pills, default toggle, save CTA bottom-anchored.
- Select Address: search bar, current location row with arrow, saved addresses as selectable cards with radio indicator, dashed add-new box, confirm CTA sticky at bottom.
- Filters: close/back icon, title; sort pills (selected filled, unselected outlined); cuisine chips with icons; rating cards with radio dots; delivery fee pill set; promoted toggle; clear/apply footer with bottom safe padding.
- Upload Payment Proof (new route needed): header with back + title; instruction copy; dashed upload box with cloud icon and format/size helper; two stacked buttons (Take Photo, Choose from Gallery) with distinct fills; fixed bottom CTA “Submit Proof”.
- Orders/Cart/Empty/Error: all loading states use centered activity indicator + helper text; empty states use icon, title, subtitle, CTA where relevant.

## Feature gaps → explicit requirements
- Payment proof flow: currently only a simple receipt picker in cart; must add dedicated “Upload Payment Proof” screen/route with camera/gallery options, validations (PNG/JPG/GIF, ≤10MB), upload progress, storage persistence, and linkage to orders/payment status.
- Wallet top-up/proof: wallet screen lacks Top Up/Submit Proof CTAs and balance card styling; add actions, hook into wallet mutations and proof upload; ensure transactions show status colors/icons.
- Address tagging/defaults/search: list and select screens missing radio selection UI, search input, dashed add-new box, toast feedback, and explicit default selection flow; add tags (Home/Work/Other) and default toggle per design.
- Location quick-fill: add-address uses GPS but missing banner styling and permission helper copy shown in mock; add manual/auto split with OR divider.
- Filters UX: current filters omit sort pills and styled chips/toggles; add sort section, cuisine badges with icons, rating radio blocks, delivery fee pills, promoted toggle, and sticky footer buttons with “Clear all”.
- Restaurant detail/menu: no hero overlay actions, delivery info badges, category pill styling, sold-out states, or sticky cart bar matching design; add per mock, including popular badge and out-of-stock dimming.
- Cart: missing delivery/pickup tabs, sold-out handling chips, payment method pills with radio, proof dropzone visuals, ETA banner, bottom bar styling, and cross-sells (if desired); integrate proof storage instead of local-only URI.
- Orders tracking: need status pills (Preparing/On Time), delay alert card, timeline component, map preview CTA, driver contact chips, instructions block, support/receipt actions, retry error card in list view.
- Profile/Edit Profile: add avatar camera badge, stats row, default address card with manage CTA, account list rows, membership badge, notifications badge, version footer, and logout pill styling.
- Home: add location selector line with “Delivering to” label, search bar redesign, filter pills (Open Now, Deals, price), categories carousel with images/icons, featured banners, card layouts with badges/favorite toggle.
- Responsiveness: enforce `wp/hp/rf/sp` usage for gutters and fonts; verify layouts on small phones (<360w) and tablets (>=900 longest) with safe-area spacing; avoid overflow on long copy.
