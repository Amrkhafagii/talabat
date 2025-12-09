# Admin RPC Inventory (current code usage)

From `utils/db/admin`, `useAdminOpsData`, and analytics/payout additions:

- Payment review: `list_payment_review_queue`, `approve_payment_review`, `reject_payment_review`, `submit_payment_proof`
- Driver docs: `list_driver_license_reviews`, `review_driver_license`
- Menu photos: `list_menu_photo_reviews`, `review_menu_photo`
- Payables & payouts:
  - Restaurants: `list_restaurant_payables`, `initiate_restaurant_payout`, `finalize_restaurant_payout`, `list_restaurant_payment_visibility`
  - Drivers: `list_driver_payables`, `initiate_driver_payout`, `finalize_driver_payout`, `list_driver_payout_visibility`
  - Balances/settlement: `list_payout_balances`, `settle_wallet_balance`, `daily_settlement_report`, `list_aging_payables`, `reconcile_settlement_import`, `get_ops_alerts_snapshot`, `get_ops_playbook`
- Order/admin detail: `get_order_admin_detail`
- Analytics: `admin_totals`, `admin_driver_profit`, `admin_restaurant_profit`

Source files: `utils/db/admin/*`, `hooks/useAdminOpsData.ts`, `hooks/useAdminReports.ts`, `utils/db/wallets.ts` (capture/refund), plus new analytics/payout migrations.
