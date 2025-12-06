/*
  # Admin analytics with optional filters

  - Add start/end filters to totals and profit RPCs
  - Optional restaurant/driver filters
*/

DROP FUNCTION IF EXISTS public.admin_totals();
DROP FUNCTION IF EXISTS public.admin_totals(timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.admin_totals(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS TABLE(
  total_customer_paid numeric,
  total_platform_fee numeric,
  paid_orders bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(o.total_charged), SUM(o.total)) AS total_customer_paid,
    COALESCE(SUM(o.platform_fee), 0) AS total_platform_fee,
    COUNT(*) FILTER (WHERE o.payment_status IN ('paid','captured')) AS paid_orders
  FROM public.orders o
  WHERE o.payment_status IN ('paid','captured')
    AND (p_start IS NULL OR o.created_at >= p_start)
    AND (p_end IS NULL OR o.created_at <= p_end);
$$;

REVOKE ALL ON FUNCTION public.admin_totals(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_totals(timestamptz, timestamptz) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_driver_profit();
DROP FUNCTION IF EXISTS public.admin_driver_profit(timestamptz, timestamptz, uuid);
CREATE OR REPLACE FUNCTION public.admin_driver_profit(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_driver_user_id uuid DEFAULT NULL
)
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
  WITH scoped AS (
    SELECT d.*, dd.user_id
    FROM public.deliveries d
    JOIN public.delivery_drivers dd ON dd.id = d.driver_id
    JOIN public.orders o ON o.id = d.order_id
    WHERE (p_start IS NULL OR o.created_at >= p_start)
      AND (p_end IS NULL OR o.created_at <= p_end)
      AND (p_driver_user_id IS NULL OR dd.user_id = p_driver_user_id)
  )
  SELECT
    s.driver_id,
    s.user_id,
    u.full_name,
    u.email,
    u.phone,
    COALESCE(SUM(CASE WHEN wt.type = 'driver_payout' THEN wt.amount ELSE 0 END), 0) AS gross_driver_earnings,
    COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.amount < 0 THEN wt.amount ELSE 0 END), 0) AS refunds,
    COALESCE(SUM(CASE WHEN wt.type = 'driver_payout' THEN wt.amount ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.amount < 0 THEN wt.amount ELSE 0 END), 0) AS net_driver_profit
  FROM scoped s
  LEFT JOIN public.users u ON u.id = s.user_id
  LEFT JOIN public.wallet_transactions wt ON wt.order_id = s.order_id AND wt.wallet_id IN (
    SELECT id FROM public.wallets w WHERE w.user_id = s.user_id AND w.type = 'driver'
  )
  GROUP BY s.driver_id, s.user_id, u.full_name, u.email, u.phone;
$$;

REVOKE ALL ON FUNCTION public.admin_driver_profit(timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_driver_profit(timestamptz, timestamptz, uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_restaurant_profit();
DROP FUNCTION IF EXISTS public.admin_restaurant_profit(timestamptz, timestamptz, uuid);
CREATE OR REPLACE FUNCTION public.admin_restaurant_profit(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_restaurant_id uuid DEFAULT NULL
)
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
  WITH scoped AS (
    SELECT o.*, r.owner_id
    FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
    WHERE o.payment_status IN ('paid','captured')
      AND (p_start IS NULL OR o.created_at >= p_start)
      AND (p_end IS NULL OR o.created_at <= p_end)
      AND (p_restaurant_id IS NULL OR o.restaurant_id = p_restaurant_id)
  )
  SELECT
    s.restaurant_id,
    r.name AS restaurant_name,
    r.owner_id,
    u.full_name AS owner_name,
    u.email AS owner_email,
    u.phone AS owner_phone,
    COALESCE(SUM(s.restaurant_net), 0) AS gross_restaurant_net,
    COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.amount < 0 THEN wt.amount ELSE 0 END), 0) AS refunds,
    COALESCE(SUM(s.restaurant_net), 0)
      + COALESCE(SUM(CASE WHEN wt.type = 'refund' AND wt.amount < 0 THEN wt.amount ELSE 0 END), 0) AS net_restaurant_profit
  FROM scoped s
  LEFT JOIN public.restaurants r ON r.id = s.restaurant_id
  LEFT JOIN public.users u ON u.id = r.owner_id
  LEFT JOIN public.wallet_transactions wt ON wt.order_id = s.id AND wt.wallet_id IN (
    SELECT id FROM public.wallets w WHERE w.user_id = r.owner_id AND w.type = 'restaurant'
  )
  GROUP BY s.restaurant_id, r.name, r.owner_id, u.full_name, u.email, u.phone;
$$;

REVOKE ALL ON FUNCTION public.admin_restaurant_profit(timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restaurant_profit(timestamptz, timestamptz, uuid) TO authenticated;
