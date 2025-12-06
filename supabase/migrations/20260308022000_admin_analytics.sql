/*
  # Phase 7 – Analytics

  - Total customer paid
  - Net profit per driver
  - Net profit per restaurant
  Exposed via views and RPCs for the admin dashboard.
*/

-- Total customer paid (gross) and platform fee aggregate
DROP VIEW IF EXISTS public.v_admin_totals;
CREATE VIEW public.v_admin_totals AS
SELECT
  COALESCE(SUM(o.total_charged), SUM(o.total)) AS total_customer_paid,
  COALESCE(SUM(o.platform_fee), 0) AS total_platform_fee,
  COUNT(*) FILTER (WHERE o.payment_status IN ('paid','captured')) AS paid_orders
FROM public.orders o
WHERE o.payment_status IN ('paid','captured');

DROP FUNCTION IF EXISTS public.admin_totals();
CREATE OR REPLACE FUNCTION public.admin_totals()
RETURNS TABLE(
  total_customer_paid numeric,
  total_platform_fee numeric,
  paid_orders bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.v_admin_totals;
$$;

REVOKE ALL ON FUNCTION public.admin_totals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_totals() TO authenticated;

-- Net profit per driver (payouts minus refunds)
DROP VIEW IF EXISTS public.v_driver_net_profit;
CREATE VIEW public.v_driver_net_profit AS
SELECT
  d.driver_id,
  dd.user_id,
  u.full_name,
  u.email,
  u.phone,
  COALESCE(SUM(CASE WHEN wt.type = 'driver_payout' THEN wt.amount ELSE 0 END), 0) AS gross_driver_earnings,
  COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.amount < 0 THEN wt.amount ELSE 0 END), 0) AS refunds,
  COALESCE(SUM(CASE WHEN wt.type = 'driver_payout' THEN wt.amount ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.amount < 0 THEN wt.amount ELSE 0 END), 0) AS net_driver_profit
FROM public.deliveries d
JOIN public.delivery_drivers dd ON dd.id = d.driver_id
LEFT JOIN public.users u ON u.id = dd.user_id
LEFT JOIN public.wallet_transactions wt ON wt.order_id = d.order_id AND wt.wallet_id IN (
  SELECT id FROM public.wallets w WHERE w.user_id = dd.user_id AND w.type = 'driver'
)
GROUP BY d.driver_id, dd.user_id, u.full_name, u.email, u.phone;

DROP FUNCTION IF EXISTS public.admin_driver_profit();
CREATE OR REPLACE FUNCTION public.admin_driver_profit()
RETURNS TABLE(
  driver_id uuid,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  gross_driver_earnings numeric,
  refunds numeric,
  net_driver_profit numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.v_driver_net_profit;
$$;

REVOKE ALL ON FUNCTION public.admin_driver_profit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_driver_profit() TO authenticated;

-- Net profit per restaurant (restaurant_net minus refunds)
DROP VIEW IF EXISTS public.v_restaurant_net_profit;
CREATE VIEW public.v_restaurant_net_profit AS
SELECT
  o.restaurant_id,
  r.name AS restaurant_name,
  r.owner_id,
  u.full_name AS owner_name,
  u.email AS owner_email,
  u.phone AS owner_phone,
  COALESCE(SUM(o.restaurant_net), 0) AS gross_restaurant_net,
  COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.amount < 0 THEN wt.amount ELSE 0 END), 0) AS refunds,
  COALESCE(SUM(o.restaurant_net), 0)
    + COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.amount < 0 THEN wt.amount ELSE 0 END), 0) AS net_restaurant_profit
FROM public.orders o
LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
LEFT JOIN public.users u ON u.id = r.owner_id
LEFT JOIN public.wallet_transactions wt ON wt.order_id = o.id AND wt.wallet_id IN (
  SELECT id FROM public.wallets w WHERE w.user_id = r.owner_id AND w.type = 'restaurant'
)
WHERE o.payment_status IN ('paid','captured')
GROUP BY o.restaurant_id, r.name, r.owner_id, u.full_name, u.email, u.phone;

DROP FUNCTION IF EXISTS public.admin_restaurant_profit();
CREATE OR REPLACE FUNCTION public.admin_restaurant_profit()
RETURNS TABLE(
  restaurant_id uuid,
  restaurant_name text,
  owner_id uuid,
  owner_name text,
  owner_email text,
  owner_phone text,
  gross_restaurant_net numeric,
  refunds numeric,
  net_restaurant_profit numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.v_restaurant_net_profit;
$$;

REVOKE ALL ON FUNCTION public.admin_restaurant_profit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restaurant_profit() TO authenticated;
