/*
  Phase 2 data/API gaps
  - Restaurant performance: daily + hourly aggregates, KPI deltas, dashboard RPC
  - Trusted arrivals aggregator
  - Orders: payment hold reason, timeline events, indexes
  - Wallet: pending balance, payout methods/requests, richer tx statuses, balances RPC
  - KYC: submissions, documents, steps, storage bucket hints
*/

-- Restaurant performance aggregates
CREATE TABLE IF NOT EXISTS public.restaurant_daily_perf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  perf_date date NOT NULL,
  sales numeric NOT NULL DEFAULT 0,
  orders int NOT NULL DEFAULT 0,
  customers int NOT NULL DEFAULT 0,
  menu_items int NOT NULL DEFAULT 0,
  sales_pct_change numeric,
  orders_pct_change numeric,
  aov numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, perf_date)
);

CREATE TABLE IF NOT EXISTS public.restaurant_hourly_perf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  perf_hour timestamptz NOT NULL,
  sales numeric NOT NULL DEFAULT 0,
  orders int NOT NULL DEFAULT 0,
  customers int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, perf_hour)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_hourly_perf_restaurant_hour ON public.restaurant_hourly_perf (restaurant_id, perf_hour);
CREATE INDEX IF NOT EXISTS idx_restaurant_daily_perf_restaurant_date ON public.restaurant_daily_perf (restaurant_id, perf_date);

-- Trusted arrivals (repeat customers)
CREATE TABLE IF NOT EXISTS public.restaurant_trusted_arrivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  visits int NOT NULL DEFAULT 0,
  last_visit timestamptz,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_trusted_arrivals_restaurant ON public.restaurant_trusted_arrivals (restaurant_id);
ALTER TABLE public.restaurant_trusted_arrivals
  ADD CONSTRAINT uniq_trusted_arrivals_restaurant_customer UNIQUE (restaurant_id, customer_id);

-- Orders: payment hold reason + timeline events
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_hold_reason text;

CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_note text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.users(id)
);

DROP VIEW IF EXISTS public.order_status_timeline;
CREATE VIEW public.order_status_timeline AS
SELECT
  oe.order_id,
  oe.event_type,
  oe.event_note,
  oe.created_at,
  oe.created_by
FROM public.order_events oe
ORDER BY oe.created_at DESC;

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON public.orders (status, created_at DESC);

-- Wallet extensions
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS pending_balance numeric DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- bank_account | instapay | card
  bank_name text,
  last4 text,
  is_default boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | processing | paid
  review_notes text,
  method_id uuid REFERENCES public.payout_methods(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wallet_transactions
  ALTER COLUMN status TYPE text,
  ALTER COLUMN status SET DEFAULT 'pending';

-- Dashboard RPC
CREATE OR REPLACE FUNCTION public.get_restaurant_dashboard(p_restaurant_id uuid, p_days int DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_start date := (now() - (p_days || ' days')::interval)::date;
  v_prev_start date := v_start - (p_days || ' days')::interval;
  v_curr RECORD;
  v_prev RECORD;
  v_hourly jsonb;
BEGIN
  SELECT
    COALESCE(SUM(sales), 0)::numeric AS sales,
    COALESCE(SUM(orders), 0)::numeric AS orders,
    COALESCE(SUM(customers), 0)::numeric AS customers,
    COALESCE(MAX(menu_items), 0)::numeric AS menu_items,
    COALESCE(AVG(aov), 0)::numeric AS aov
  INTO v_curr
  FROM public.restaurant_daily_perf
  WHERE restaurant_id = p_restaurant_id
    AND perf_date >= v_start;

  SELECT
    COALESCE(SUM(sales), 0)::numeric AS sales,
    COALESCE(SUM(orders), 0)::numeric AS orders,
    COALESCE(SUM(customers), 0)::numeric AS customers,
    COALESCE(MAX(menu_items), 0)::numeric AS menu_items,
    COALESCE(AVG(aov), 0)::numeric AS aov
  INTO v_prev
  FROM public.restaurant_daily_perf
  WHERE restaurant_id = p_restaurant_id
    AND perf_date >= v_prev_start
    AND perf_date < v_start;

  SELECT jsonb_agg(jsonb_build_object(
    'hour', perf_hour,
    'sales', sales,
    'orders', orders,
    'customers', customers
  ) ORDER BY perf_hour) INTO v_hourly
  FROM public.restaurant_hourly_perf
  WHERE restaurant_id = p_restaurant_id
    AND perf_hour >= v_start;

  RETURN jsonb_build_object(
    'summary', jsonb_build_object(
      'sales', COALESCE(v_curr.sales, 0),
      'orders', COALESCE(v_curr.orders, 0),
      'customers', COALESCE(v_curr.customers, 0),
      'menu_items', COALESCE(v_curr.menu_items, 0),
      'aov', COALESCE(v_curr.aov, 0),
      'sales_pct_change', CASE WHEN COALESCE(v_prev.sales, 0) = 0 THEN NULL ELSE ROUND(((COALESCE(v_curr.sales, 0) - COALESCE(v_prev.sales, 0)) / NULLIF(v_prev.sales, 0)) * 100, 2) END,
      'orders_pct_change', CASE WHEN COALESCE(v_prev.orders, 0) = 0 THEN NULL ELSE ROUND(((COALESCE(v_curr.orders, 0) - COALESCE(v_prev.orders, 0)) / NULLIF(v_prev.orders, 0)) * 100, 2) END,
      'customers_pct_change', CASE WHEN COALESCE(v_prev.customers, 0) = 0 THEN NULL ELSE ROUND(((COALESCE(v_curr.customers, 0) - COALESCE(v_prev.customers, 0)) / NULLIF(v_prev.customers, 0)) * 100, 2) END,
      'aov_pct_change', CASE WHEN COALESCE(v_prev.aov, 0) = 0 THEN NULL ELSE ROUND(((COALESCE(v_curr.aov, 0) - COALESCE(v_prev.aov, 0)) / NULLIF(v_prev.aov, 0)) * 100, 2) END
    ),
    'hourly', coalesce(v_hourly, '[]'::jsonb)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_restaurant_dashboard(uuid, int) TO authenticated, service_role;

-- Trusted arrivals RPC (enriched with user profile)
CREATE OR REPLACE FUNCTION public.get_trusted_arrivals(p_restaurant_id uuid, p_days int DEFAULT 7)
RETURNS TABLE(
  customer_id uuid,
  visits int,
  last_visit timestamptz,
  avatar_url text,
  full_name text
)
LANGUAGE sql
AS $$
  SELECT
    rta.customer_id,
    rta.visits,
    rta.last_visit,
    COALESCE(rta.avatar_url, u.avatar_url) AS avatar_url,
    u.full_name
  FROM public.restaurant_trusted_arrivals rta
  LEFT JOIN public.users u ON u.id = rta.customer_id
  WHERE rta.restaurant_id = p_restaurant_id
    AND rta.last_visit >= now() - (p_days || ' days')::interval
  ORDER BY rta.visits DESC, rta.last_visit DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_trusted_arrivals(uuid, int) TO authenticated, service_role;

-- Wallet balance RPC
CREATE OR REPLACE FUNCTION public.get_wallet_balances(p_wallet_id uuid)
RETURNS TABLE(available numeric, pending numeric)
LANGUAGE sql
AS $$
  SELECT COALESCE(w.balance, 0), COALESCE(w.pending_balance, 0)
  FROM public.wallets w
  WHERE w.id = p_wallet_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_wallet_balances(uuid) TO authenticated, service_role;

-- KYC tables
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending | reviewing | approved | rejected
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  notes text
);

CREATE TABLE IF NOT EXISTS public.kyc_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
  step text NOT NULL, -- owner_details, business_details, documents
  status text NOT NULL DEFAULT 'pending',
  data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  doc_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  uploaded_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- Buckets: create via dashboard tooling. Use: storage bucket "kyc-documents".

CREATE OR REPLACE FUNCTION public.get_kyc_status(p_restaurant_id uuid)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'submission', (SELECT s FROM public.kyc_submissions s WHERE s.restaurant_id = p_restaurant_id ORDER BY submitted_at DESC LIMIT 1),
    'steps', (SELECT jsonb_agg(ks) FROM public.kyc_steps ks JOIN public.kyc_submissions s ON s.id = ks.submission_id WHERE s.restaurant_id = p_restaurant_id),
    'documents', (SELECT jsonb_agg(kd) FROM public.kyc_documents kd JOIN public.kyc_submissions s ON s.id = kd.submission_id WHERE s.restaurant_id = p_restaurant_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_kyc_status(uuid) TO authenticated, service_role;

-- Aggregate refresh helpers (backfill + future cron)
CREATE OR REPLACE FUNCTION public.refresh_restaurant_performance(p_restaurant_id uuid DEFAULT NULL, p_days int DEFAULT 90)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH filtered_orders AS (
    SELECT *
    FROM public.orders o
    WHERE (p_restaurant_id IS NULL OR o.restaurant_id = p_restaurant_id)
      AND o.created_at >= now() - (p_days || ' days')::interval
      AND o.status NOT IN ('cancelled')
  ),
  menu_counts AS (
    SELECT restaurant_id, COUNT(*) AS menu_items
    FROM public.menu_items
    GROUP BY restaurant_id
  ),
  daily AS (
    SELECT
      o.restaurant_id,
      (o.created_at AT TIME ZONE 'utc')::date AS perf_date,
      COALESCE(SUM(o.total), 0) AS sales,
      COUNT(*) AS orders,
      COUNT(DISTINCT o.user_id) AS customers,
      COALESCE(mc.menu_items, 0) AS menu_items
    FROM filtered_orders o
    LEFT JOIN menu_counts mc ON mc.restaurant_id = o.restaurant_id
    GROUP BY o.restaurant_id, perf_date, mc.menu_items
  )
  INSERT INTO public.restaurant_daily_perf (restaurant_id, perf_date, sales, orders, customers, menu_items, aov, created_at)
  SELECT
    restaurant_id,
    perf_date,
    sales,
    orders,
    customers,
    menu_items,
    CASE WHEN orders > 0 THEN sales / orders ELSE 0 END,
    now()
  FROM daily
  ON CONFLICT (restaurant_id, perf_date) DO UPDATE
    SET sales = EXCLUDED.sales,
        orders = EXCLUDED.orders,
        customers = EXCLUDED.customers,
        menu_items = EXCLUDED.menu_items,
        aov = EXCLUDED.aov;

  WITH filtered_orders AS (
    SELECT *
    FROM public.orders o
    WHERE (p_restaurant_id IS NULL OR o.restaurant_id = p_restaurant_id)
      AND o.created_at >= now() - (p_days || ' days')::interval
      AND o.status NOT IN ('cancelled')
  ),
  hourly AS (
    SELECT
      o.restaurant_id,
      date_trunc('hour', o.created_at AT TIME ZONE 'utc') AS perf_hour,
      COALESCE(SUM(o.total), 0) AS sales,
      COUNT(*) AS orders,
      COUNT(DISTINCT o.user_id) AS customers
    FROM filtered_orders o
    GROUP BY o.restaurant_id, perf_hour
  )
  INSERT INTO public.restaurant_hourly_perf (restaurant_id, perf_hour, sales, orders, customers, created_at)
  SELECT
    restaurant_id,
    perf_hour,
    sales,
    orders,
    customers,
    now()
  FROM hourly
  ON CONFLICT (restaurant_id, perf_hour) DO UPDATE
    SET sales = EXCLUDED.sales,
        orders = EXCLUDED.orders,
        customers = EXCLUDED.customers;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_trusted_arrivals(p_restaurant_id uuid DEFAULT NULL, p_days int DEFAULT 90)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH recent_orders AS (
    SELECT *
    FROM public.orders o
    WHERE (p_restaurant_id IS NULL OR o.restaurant_id = p_restaurant_id)
      AND o.created_at >= now() - (p_days || ' days')::interval
      AND o.status NOT IN ('cancelled')
  ),
  agg AS (
    SELECT
      o.restaurant_id,
      o.user_id AS customer_id,
      COUNT(*) AS visits,
      MAX(o.created_at) AS last_visit,
      MAX(u.avatar_url) AS avatar_url
    FROM recent_orders o
    JOIN public.users u ON u.id = o.user_id
    GROUP BY o.restaurant_id, o.user_id
  )
  INSERT INTO public.restaurant_trusted_arrivals (restaurant_id, customer_id, visits, last_visit, avatar_url, created_at, updated_at)
  SELECT
    restaurant_id,
    customer_id,
    visits,
    last_visit,
    avatar_url,
    now(),
    now()
  FROM agg
  ON CONFLICT (restaurant_id, customer_id) DO UPDATE
    SET visits = EXCLUDED.visits,
        last_visit = EXCLUDED.last_visit,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.restaurant_trusted_arrivals.avatar_url),
        updated_at = now();
END $$;

-- Initial backfill
SELECT public.refresh_restaurant_performance(NULL, 365);
SELECT public.refresh_trusted_arrivals(NULL, 365);
