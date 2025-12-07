## Delivery UI – Phase 1 Audit & Alignment

### Screen / Flow Map (current files)
- Dashboard / Online toggle / Active & available deliveries: `app/(tabs)/delivery/index.tsx`
- Active delivery navigation + status transitions (Assigned → Picked Up → Delivered): `app/(tabs)/delivery/navigation.tsx`
- Earnings (light metrics view): `app/(tabs)/delivery/earnings.tsx`
- Delivery history: `app/(tabs)/delivery/history.tsx`
- Wallet / payout details: `app/(tabs)/delivery/wallet.tsx`
- Driver profile, documents, payout setup: `app/(tabs)/delivery/profile.tsx`

### Shared UI + Theme Points
- Buttons, cards, typography, spacing, shadows currently come from:
  - `components/ui/Button.tsx`
  - `components/ui/Card.tsx`
  - `components/delivery/DeliveryCard.tsx`
  - `components/common/StatCard.tsx`
  - Themes: `styles/restaurantTheme.tsx` (dark-oriented), `styles/iosTheme.ts` (light iOS presets)
- New delivery token source added for the redesign: `styles/deliveryTokens.ts` (light + dark earnings variant).
- Hooks providing UX behaviors:
  - Realtime deliveries stream + accept/update: `hooks/useRealtimeDeliveries.ts`
  - Driver location tracking + map deep links: `hooks/useDriverLocationTracking.ts`

### Data Dependencies (delivery lifecycle, payouts, issues)
- Delivery model + enums: `types/database.ts` → `Delivery.status` is one of `available | assigned | picked_up | on_the_way | delivered | cancelled`. Lifecycle timestamps: `assigned_at`, `picked_up_at`, `delivered_at`, `cancelled_at`, `cancellation_reason`. Payout fields: `payout_status`, `payout_at`, `driver_payout_status`, `driver_payout_ref`, `driver_payout_handle`.
- Driver model flags: `documents_verified`, `license_document_status`, `doc_review_status`, `is_online`, `is_available`, current coords.
- Order status + timestamps: `utils/db/orders.ts` → `updateOrderStatus` sets `confirmed_at`, `prepared_at`, `picked_up_at`, `delivered_at`, `cancelled_at`, `cancellation_reason`.
- Delivery status mutations: `utils/db/deliveries.ts`
  - `updateDeliveryStatus` → uses RPC `update_delivery_status_safe`; also mirrors order status, triggers driver payout on delivered, and toggles driver availability if they stay online.
  - `confirmPickupWithTempCheck`, `confirmDeliveryWithHandoff` wrap the RPC with extra flags.
  - `assignNearestDriverForOrder` computes distance/ETA, sets `driver_id`, `assigned_at`, and creates/updates delivery rows.
- Wallet + payouts: `utils/db/wallets.ts`
  - `payoutDriverDelivery` RPC on delivered; `releaseOrderPayment`, `holdOrderPayment`, `captureOrderPayment`, `refundOrderPayment`.
  - `requestPayout`, `listPayoutMethods`, `createPayoutMethod`, `setDefaultPayoutMethod`, `deletePayoutMethod`.
- Order creation + ledger: `utils/db/orders.ts` uses RPCs `create_order_payment_pending`, `set_order_eta_from_components`; logs events and handles substitutions (`createDeliveryEvent`, `logAudit`).

### Design Tokens Locked from Mocks (source of truth)
Use these for all new delivery UI; dark variant is only for the dark earnings screen.

**Light (Delivery)**
- Primary orange: `#FF6B35`
- Primary orange-strong (CTA hover/pressed): `#FF7E3F`
- Accent soft (chips/backgrounds): `#FFE8DB`
- Background: `#F8F6F3`
- Surface / card: `#FFFFFF`
- Surface alt: `#F4F1ED`
- Border: `#E5E1DA`
- Shadow (cards): `rgba(0,0,0,0.08)` with 0,6,14 blur equivalent
- Text strong: `#1B1B1B`
- Text muted: `#6B7280`
- Text subtle: `#8A8F99`
- Success green: `#1FB360`
- Warning amber: `#F59E0B`
- Error red: `#D92D20`
- Positive green (earnings amounts): `#16A34A`
- Gray pill bg: `#F0F1F5`

**Dark (Earnings)**
- Background: `#0F1524`
- Surface: `#121A2C`
- Surface-strong: `#0D1322`
- Primary text: `#FFFFFF`
- Secondary text: `#9FB3D9`
- Accent blue: `#1F3B73`
- CTA / highlight: `#1E3A8A`
- Success green: `#22C55E`
- Warning amber: `#FBBF24`
- Error red: `#F87171`

**Typography**
- Title XL: 28/34, weight 700
- Title L: 24/30, weight 700
- Title M: 20/26, weight 700
- Body: 16/22, weight 400
- Subhead: 15/22, weight 600
- Caption: 13/18, weight 500
- Button: 16/20, weight 700; Small button: 14/18, weight 700

**Spacing (dp)**
- xxs 4, xs 8, sm 12, md 16, lg 20, xl 24, 2xl 32

**Radii**
- Card: 18
- Field/segmented/pill: 12–14
- CTA large (bottom bars): 18–24 with pill option 999

**Shadows (iOS/Android target)**
- Card: elevation 6 / shadowOpacity ~0.08, radius 12
- Raised CTA: elevation 10 / shadowOpacity ~0.14, radius 16

### Notes for Phase 2+
- Replace `styles/restaurantTheme.tsx` usage in delivery surfaces with the above tokens.
- Build primitives (Button/Card/Header/Segmented/Progress/Pill) off these tokens and remove old mismatched variants.
- Dark earnings view should switch to the dark token set but keep typography/spacing consistent.
