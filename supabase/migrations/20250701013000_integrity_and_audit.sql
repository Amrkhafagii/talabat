/*
  # Integrity and audit

  - Add uniqueness/indexes for addresses and orders
  - Validate distance queries via NOTIFY (lightweight)
  - Add audit log table for critical actions
  - Guard against re-seeding sample data in production
*/

-- Indexes and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_user_label_uniq
  ON public.user_addresses (user_id, label);

CREATE INDEX IF NOT EXISTS orders_user_created_at_idx
  ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_restaurant_created_at_idx
  ON public.orders (restaurant_id, created_at DESC);

-- Distance validation hook (debugging aid, no-op unless listened)
CREATE OR REPLACE FUNCTION public.log_distance_query(p_lat double precision, p_lng double precision, p_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify('distance_query', jsonb_build_object(
    'lat', p_lat,
    'lng', p_lng,
    'restaurant_id', p_restaurant_id,
    'ts', now()
  )::text);
END;
$$;

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  actor uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_table_idx ON public.audit_logs(table_name, created_at DESC);

-- Guard sample data seeding in production by checking for existing rows
CREATE OR REPLACE FUNCTION public.safe_seed_check(p_table text, p_threshold int DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  existing_count int;
BEGIN
  EXECUTE format('SELECT count(*) FROM %I', p_table) INTO existing_count;
  IF existing_count > p_threshold THEN
    RAISE EXCEPTION 'Seeding aborted: table % exceeds threshold (%)', p_table, p_threshold;
  END IF;
END;
$$;

/*
  Payment foundations: single customer charge + splitable payables
  - platform_fee = 10% of subtotal
  - restaurant_net = subtotal + tax + tip - platform_fee
  - delivery_fee is a pass-through to driver
*/
-- Expand payment_status to cover pending review flow
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (
    payment_status IN (
      'payment_pending',
      'paid_pending_review',
      'paid',
      'initiated',
      'hold',
      'captured',
      'refunded',
      'failed',
      'voided'
    )
  );
ALTER TABLE public.orders ALTER COLUMN payment_status SET DEFAULT 'payment_pending';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_fee numeric(12,2),
  ADD COLUMN IF NOT EXISTS restaurant_net numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_charged numeric(12,2),
  ADD COLUMN IF NOT EXISTS customer_payment_txn_id text,
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS chargeback_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS restaurant_payout_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS restaurant_payout_ref text,
  ADD COLUMN IF NOT EXISTS restaurant_payout_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS restaurant_payout_last_error text,
  ADD COLUMN IF NOT EXISTS driver_payout_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS driver_payout_ref text,
  ADD COLUMN IF NOT EXISTS driver_payout_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_payout_last_error text,
  ADD COLUMN IF NOT EXISTS restaurant_payout_next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_payout_next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_fee_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_proof_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_proof_last_attempt timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reported_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_auto_verified boolean,
  ADD COLUMN IF NOT EXISTS payment_txn_duplicate boolean,
  ADD COLUMN IF NOT EXISTS payment_review_notes text;

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS driver_payout_handle text,
  ADD COLUMN IF NOT EXISTS driver_payout_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS driver_payout_ref text;

-- Normalize payout status defaults before constraints
UPDATE public.orders
SET restaurant_payout_status = COALESCE(NULLIF(trim(restaurant_payout_status), ''), 'pending'),
    driver_payout_status = COALESCE(NULLIF(trim(driver_payout_status), ''), 'pending')
WHERE restaurant_payout_status IS NULL
   OR driver_payout_status IS NULL
   OR trim(restaurant_payout_status) = ''
   OR trim(driver_payout_status) = '';

UPDATE public.deliveries
SET driver_payout_status = COALESCE(NULLIF(trim(driver_payout_status), ''), 'pending')
WHERE driver_payout_status IS NULL OR trim(driver_payout_status) = '';

-- Deduplicate payout refs/handles prior to unique indexes
WITH rp AS (
  SELECT id, restaurant_payout_ref, row_number() OVER (PARTITION BY restaurant_payout_ref ORDER BY created_at) AS rn
  FROM public.orders
  WHERE restaurant_payout_ref IS NOT NULL
)
UPDATE public.orders o
SET restaurant_payout_ref = NULL
FROM rp
WHERE o.id = rp.id AND rp.rn > 1;

WITH drp AS (
  SELECT id, driver_payout_ref, row_number() OVER (PARTITION BY driver_payout_ref ORDER BY created_at) AS rn
  FROM public.orders
  WHERE driver_payout_ref IS NOT NULL
)
UPDATE public.orders o
SET driver_payout_ref = NULL
FROM drp
WHERE o.id = drp.id AND drp.rn > 1;

WITH dph AS (
  SELECT id, driver_payout_handle, row_number() OVER (PARTITION BY driver_payout_handle ORDER BY created_at) AS rn
  FROM public.deliveries
  WHERE driver_payout_handle IS NOT NULL
)
UPDATE public.deliveries d
SET driver_payout_handle = NULL
FROM dph
WHERE d.id = dph.id AND dph.rn > 1;

-- Constrain payout statuses to a known set
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_restaurant_payout_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_restaurant_payout_status_check
  CHECK (restaurant_payout_status IN ('pending','initiated','paid','failed'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_driver_payout_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_driver_payout_status_check
  CHECK (driver_payout_status IN ('pending','initiated','paid','failed'));

ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_driver_payout_status_check;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_driver_payout_status_check
  CHECK (driver_payout_status IN ('pending','initiated','paid','failed'));

-- Enforce uniqueness on payout refs/handles when provided
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_payout_ref_unique
  ON public.orders (restaurant_payout_ref)
  WHERE restaurant_payout_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS driver_payout_ref_unique
  ON public.orders (driver_payout_ref)
  WHERE driver_payout_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS driver_payout_handle_unique
  ON public.deliveries (driver_payout_handle)
  WHERE driver_payout_handle IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_payout_status_idx
  ON public.orders (restaurant_payout_status, driver_payout_status);

-- PSP settlement imports for reconciliation
CREATE TABLE IF NOT EXISTS public.settlement_imports (
  id bigserial PRIMARY KEY,
  settlement_date date NOT NULL,
  txn_id text NOT NULL,
  payment_ref text,
  amount numeric(12,2),
  channel text,
  recon_status text,
  reconciled_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS settlement_imports_txn_idx ON public.settlement_imports(txn_id);

-- Backfill new reconciliation fields idempotently
ALTER TABLE public.settlement_imports
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS recon_status text,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz;

-- Payout attempt journal for idempotency and backoff
CREATE TABLE IF NOT EXISTS public.payout_attempts (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('restaurant','driver')),
  idempotency_key text NOT NULL,
  payout_ref text,
  success boolean,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payout_attempts_unique
  ON public.payout_attempts (order_id, direction, idempotency_key);
CREATE INDEX IF NOT EXISTS payout_attempts_order_idx
  ON public.payout_attempts (order_id, created_at DESC);

-- Helper to standardize payout/audit event payloads
CREATE OR REPLACE FUNCTION public.log_payout_event(
  p_order_id uuid,
  p_scope text, -- 'restaurant' | 'driver'
  p_stage text, -- 'initiated' | 'paid' | 'failed'
  p_idempotency_key text,
  p_payout_ref text DEFAULT NULL,
  p_error text DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_event text;
  v_order record;
  v_delivery record;
  v_payload jsonb;
BEGIN
  IF p_order_id IS NULL OR p_scope IS NULL OR p_stage IS NULL THEN
    RAISE EXCEPTION 'payout event requires order_id, scope, and stage';
  END IF;

  IF p_scope = 'restaurant' THEN
    v_event := format('restaurant_payout_%s', p_stage);
  ELSIF p_scope = 'driver' THEN
    v_event := format('delivery_payout_%s', p_stage);
  ELSE
    RAISE EXCEPTION 'invalid scope for payout event: %', p_scope;
  END IF;

  SELECT
    o.restaurant_id,
    o.restaurant_net,
    o.platform_fee,
    o.delivery_fee,
    o.tip_amount,
    o.total_charged,
    o.payment_status
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id;

  SELECT driver_id, driver_payout_handle
  INTO v_delivery
  FROM public.deliveries
  WHERE order_id = p_order_id
  LIMIT 1;

  v_payload := jsonb_build_object(
    'order_id', p_order_id,
    'scope', p_scope,
    'stage', p_stage,
    'idempotency_key', p_idempotency_key,
    'payout_ref', p_payout_ref,
    'error', p_error,
    'restaurant_id', v_order.restaurant_id,
    'driver_id', COALESCE(p_driver_id, v_delivery.driver_id),
    'driver_handle', v_delivery.driver_payout_handle,
    'payment_status', v_order.payment_status,
    'ledger', CASE
      WHEN p_scope = 'restaurant' THEN jsonb_build_object(
        'restaurant_net', v_order.restaurant_net,
        'platform_fee', v_order.platform_fee,
        'delivery_fee', v_order.delivery_fee,
        'tip_amount', v_order.tip_amount,
        'total_charged', v_order.total_charged
      )
      ELSE jsonb_build_object(
        'delivery_fee', v_order.delivery_fee,
        'tip_amount', v_order.tip_amount,
        'driver_payable', COALESCE(v_order.delivery_fee, 0) + COALESCE(v_order.tip_amount, 0)
      )
    END,
    'ts', now(),
    'event', v_event
  );

  INSERT INTO public.delivery_events(order_id, driver_id, event_type, payload)
  VALUES (
    p_order_id,
    CASE WHEN p_scope = 'driver' THEN COALESCE(p_driver_id, v_delivery.driver_id) ELSE NULL END,
    v_event,
    v_payload
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    v_event,
    'orders',
    p_order_id,
    v_payload
  )
  ON CONFLICT DO NOTHING;

  PERFORM pg_notify(
    'payout_events',
    v_payload::text
  );

  PERFORM pg_notify(
    CASE WHEN p_scope = 'restaurant' THEN 'restaurant_payout_events' ELSE 'driver_payout_events' END,
    v_payload::text
  );
END;
$$;

-- RPC: create order in payment_pending with computed splits
CREATE OR REPLACE FUNCTION public.create_order_payment_pending(
  p_user_id uuid,
  p_restaurant_id uuid,
  p_delivery_address_id uuid,
  p_delivery_address text,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_tax_amount numeric DEFAULT 0,
  p_tip_amount numeric DEFAULT 0,
  p_payment_method text DEFAULT 'instapay',
  p_payment_ref text DEFAULT NULL,
  p_receipt_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_platform_fee numeric(12,2);
  v_restaurant_net numeric(12,2);
  v_total numeric(12,2);
  v_order_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'user_id and restaurant_id are required';
  END IF;

  IF p_delivery_address IS NULL THEN
    RAISE EXCEPTION 'delivery_address is required';
  END IF;

  v_platform_fee := ROUND(COALESCE(p_subtotal, 0) * 0.10, 2);
  v_restaurant_net := ROUND(COALESCE(p_subtotal, 0) + COALESCE(p_tax_amount, 0) + COALESCE(p_tip_amount, 0) - v_platform_fee, 2);
  v_total := ROUND(
    COALESCE(p_subtotal, 0) +
    COALESCE(p_tax_amount, 0) +
    COALESCE(p_tip_amount, 0) +
    COALESCE(p_delivery_fee, 0) +
    v_platform_fee,
    2
  );

  IF v_restaurant_net < 0 THEN
    RAISE EXCEPTION 'restaurant_net would be negative';
  END IF;

  INSERT INTO public.orders (
    user_id,
    restaurant_id,
    delivery_address_id,
    delivery_address,
    subtotal,
    delivery_fee,
    tax_amount,
    tip_amount,
    total,
    platform_fee,
    restaurant_net,
    total_charged,
    payment_status,
    payment_method,
    customer_payment_txn_id,
    receipt_url,
    status
  )
  VALUES (
    p_user_id,
    p_restaurant_id,
    p_delivery_address_id,
    p_delivery_address,
    p_subtotal,
    p_delivery_fee,
    p_tax_amount,
    p_tip_amount,
    v_total,
    v_platform_fee,
    v_restaurant_net,
    v_total,
    'payment_pending',
    p_payment_method,
    p_payment_ref,
    p_receipt_url,
    'pending'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'payment_collected',
    'orders',
    v_order_id,
    jsonb_build_object(
      'stage', 'payment_pending',
      'platform_fee', v_platform_fee,
      'restaurant_net', v_restaurant_net,
      'total_charged', v_total,
      'payment_method', p_payment_method
    )
  );

  RETURN v_order_id;
END;
$$;

-- RPC: customer submits payment proof -> auto verification or manual review
DROP FUNCTION IF EXISTS public.submit_payment_proof(uuid, text, numeric, text, timestamptz);
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_order_id uuid,
  p_txn_id text,
  p_reported_amount numeric,
  p_receipt_url text,
  p_paid_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_expected numeric(12,2);
  v_dup boolean;
  v_diff numeric;
  v_window interval := interval '6 hours';
  v_new_status text;
  v_reasons text[] := '{}';
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.payment_status IN ('paid', 'captured') THEN
    RETURN v_order.payment_status;
  END IF;

  IF v_order.customer_payment_txn_id IS NOT NULL AND v_order.customer_payment_txn_id <> p_txn_id THEN
    RAISE EXCEPTION 'Transaction already recorded with a different id';
  END IF;

  v_expected := COALESCE(
    v_order.total_charged,
    v_order.total,
    (COALESCE(v_order.subtotal, 0) + COALESCE(v_order.tax_amount, 0) + COALESCE(v_order.tip_amount, 0) + COALESCE(v_order.delivery_fee, 0) + COALESCE(v_order.platform_fee, 0))
  );
  v_diff := abs(COALESCE(p_reported_amount, 0) - COALESCE(v_expected, 0));

  v_dup := EXISTS (
    SELECT 1 FROM public.orders
    WHERE customer_payment_txn_id = p_txn_id
      AND id <> p_order_id
  );

  IF p_txn_id IS NULL OR length(trim(p_txn_id)) = 0 THEN
    v_reasons := array_append(v_reasons, 'missing_txn_id');
  END IF;

  IF v_dup THEN
    v_reasons := array_append(v_reasons, 'duplicate_txn_id');
  END IF;

  IF v_diff > 0.01 THEN
    v_reasons := array_append(v_reasons, 'amount_mismatch');
  END IF;

  IF v_order.created_at IS NOT NULL THEN
    IF p_paid_at < (v_order.created_at - v_window) OR p_paid_at > (now() + interval '1 day') THEN
      v_reasons := array_append(v_reasons, 'timestamp_out_of_window');
    END IF;
  END IF;

  -- Force manual review for all uploads so admins can approve
  v_reasons := array_append(v_reasons, 'manual_review');
  v_new_status := 'paid_pending_review';

  -- Simple rate limit: max 5 attempts per rolling hour
  IF COALESCE(v_order.payment_proof_attempts, 0) >= 5 AND v_order.payment_proof_last_attempt > (now() - interval '1 hour') THEN
    RAISE EXCEPTION 'Too many payment proof attempts, please retry later';
  END IF;

  UPDATE public.orders
  SET payment_status = v_new_status,
      customer_payment_txn_id = COALESCE(customer_payment_txn_id, p_txn_id),
      receipt_url = COALESCE(p_receipt_url, receipt_url),
      total_charged = COALESCE(total_charged, v_expected),
      payment_reported_amount = p_reported_amount,
      payment_auto_verified = false,
      payment_txn_duplicate = v_dup,
      payment_proof_attempts = COALESCE(payment_proof_attempts, 0) + 1,
      payment_proof_last_attempt = now(),
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'payment_collected',
    'orders',
    p_order_id,
    jsonb_build_object(
      'txn_id', p_txn_id,
      'reported_amount', p_reported_amount,
      'expected_amount', v_expected,
      'auto_verified', false,
      'status', v_new_status,
      'reasons', v_reasons,
      'amount_diff', v_diff
    )
  );

  RETURN jsonb_build_object(
    'status', v_new_status,
    'auto_verified', false,
    'amount_diff', v_diff,
    'expected_amount', v_expected,
    'reported_amount', p_reported_amount,
    'txn_id_duplicate', v_dup,
    'mismatch_reasons', v_reasons
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_proof(uuid, text, numeric, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(uuid, text, numeric, text, timestamptz) TO authenticated;

-- Manual review + payables helpers for admin console
DROP FUNCTION IF EXISTS public.list_payment_review_queue();
CREATE OR REPLACE FUNCTION public.list_payment_review_queue()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  restaurant_id uuid,
  total_charged numeric,
  total numeric,
  subtotal numeric,
  tax_amount numeric,
  tip_amount numeric,
  delivery_fee numeric,
  platform_fee numeric,
  restaurant_net numeric,
  customer_payment_txn_id text,
  receipt_url text,
  expected_amount numeric,
  reported_amount numeric,
  amount_diff numeric,
  auto_verified boolean,
  txn_id_duplicate boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_claims jsonb;
  v_claim_user_type text;
  v_role text;
BEGIN
  v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_claim_user_type := COALESCE(
    current_setting('request.jwt.claim.user_type', true),
    v_claims->>'user_type',
    v_claims->'user_metadata'->>'user_type',
    v_claims->'app_metadata'->>'user_type',
    ''
  );
  v_role := COALESCE(
    current_setting('request.jwt.claim.role', true),
    v_claims->>'role',
    ''
  );

  SELECT
    (v_claim_user_type = 'admin')
    OR (v_role IN ('service_role','supabase_admin'))
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  INTO v_is_admin;

  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'admin access required for payment review queue';
  END IF;

  RETURN QUERY
  SELECT
    o.id AS id,
    o.user_id,
    o.restaurant_id,
    o.total_charged,
    o.total,
    o.subtotal,
    o.tax_amount,
    o.tip_amount,
    o.delivery_fee,
    o.platform_fee,
    o.restaurant_net,
    o.customer_payment_txn_id,
    o.receipt_url,
    COALESCE(
      o.total_charged,
      o.total,
      (COALESCE(o.subtotal, 0) + COALESCE(o.tax_amount, 0) + COALESCE(o.tip_amount, 0) + COALESCE(o.delivery_fee, 0) + COALESCE(o.platform_fee, 0))
    ) AS expected_amount,
    o.payment_reported_amount AS reported_amount,
    abs(COALESCE(o.payment_reported_amount, 0) - COALESCE(
      o.total_charged,
      o.total,
      (COALESCE(o.subtotal, 0) + COALESCE(o.tax_amount, 0) + COALESCE(o.tip_amount, 0) + COALESCE(o.delivery_fee, 0) + COALESCE(o.platform_fee, 0))
    )) AS amount_diff,
    o.payment_auto_verified AS auto_verified,
    o.payment_txn_duplicate AS txn_id_duplicate,
    o.created_at
  FROM public.orders o
  WHERE o.payment_status = 'paid_pending_review'
  ORDER BY o.created_at DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.list_payment_review_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_payment_review_queue() TO authenticated;

-- Remove legacy overloads so RPC call resolves unambiguously
DROP FUNCTION IF EXISTS public.approve_payment_review(uuid, uuid);
DROP FUNCTION IF EXISTS public.approve_payment_review(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.approve_payment_review(p_order_id uuid, p_actor uuid DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_claims jsonb;
  v_claim_user_type text;
  v_role text;
  v_is_admin boolean;
BEGIN
  v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_claim_user_type := COALESCE(
    current_setting('request.jwt.claim.user_type', true),
    v_claims->>'user_type',
    v_claims->'user_metadata'->>'user_type',
    v_claims->'app_metadata'->>'user_type',
    ''
  );
  v_role := COALESCE(
    current_setting('request.jwt.claim.role', true),
    v_claims->>'role',
    ''
  );

  SELECT
    (v_claim_user_type = 'admin')
    OR (v_role IN ('service_role','supabase_admin'))
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  INTO v_is_admin;

  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'admin access required for payment review actions';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.payment_status IS DISTINCT FROM 'paid_pending_review' THEN
    RAISE EXCEPTION 'Order not in paid_pending_review: %', v_order.payment_status;
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      payment_review_notes = COALESCE(p_notes, payment_review_notes),
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'payment_review_approved',
    'orders',
    p_order_id,
    p_actor,
    jsonb_build_object('order_id', p_order_id, 'notes', p_notes)
  )
  ON CONFLICT DO NOTHING;
END;
$$;

DROP FUNCTION IF EXISTS public.reject_payment_review(uuid, uuid);
DROP FUNCTION IF EXISTS public.reject_payment_review(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.reject_payment_review(p_order_id uuid, p_reason text DEFAULT NULL, p_actor uuid DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_claims jsonb;
  v_claim_user_type text;
  v_role text;
  v_is_admin boolean;
BEGIN
  v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_claim_user_type := COALESCE(
    current_setting('request.jwt.claim.user_type', true),
    v_claims->>'user_type',
    v_claims->'user_metadata'->>'user_type',
    v_claims->'app_metadata'->>'user_type',
    ''
  );
  v_role := COALESCE(
    current_setting('request.jwt.claim.role', true),
    v_claims->>'role',
    ''
  );

  SELECT
    (v_claim_user_type = 'admin')
    OR (v_role IN ('service_role','supabase_admin'))
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.user_type = 'admin'
    )
  INTO v_is_admin;

  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'admin access required for payment review actions';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.payment_status IS DISTINCT FROM 'paid_pending_review' THEN
    RAISE EXCEPTION 'Order not in paid_pending_review: %', v_order.payment_status;
  END IF;

  UPDATE public.orders
  SET payment_status = 'failed',
      payment_review_notes = COALESCE(p_notes, payment_review_notes),
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'payment_review_rejected',
    'orders',
    p_order_id,
    p_actor,
    jsonb_build_object('reason', p_reason, 'notes', p_notes)
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Restaurant payout execution with idempotency
CREATE OR REPLACE FUNCTION public.initiate_restaurant_payout(
  p_order_id uuid,
  p_idempotency_key text,
  p_payout_ref text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_ref text;
  v_attempted boolean;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key required';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.chargeback_flag IS TRUE OR v_order.payment_status IN ('refunded','voided','failed') THEN
    RAISE EXCEPTION 'Payout blocked: payment_status=% or chargeback flag set', v_order.payment_status;
  END IF;

  IF v_order.restaurant_payout_status = 'paid' THEN
    RETURN 'paid';
  END IF;

  IF v_order.payment_status NOT IN ('paid','captured') THEN
    RAISE EXCEPTION 'Order must be paid before restaurant payout';
  END IF;

  v_ref := COALESCE(p_payout_ref, v_order.restaurant_payout_ref, p_idempotency_key);

  INSERT INTO public.payout_attempts(order_id, direction, idempotency_key, payout_ref)
  VALUES (p_order_id, 'restaurant', p_idempotency_key, v_ref)
  ON CONFLICT DO NOTHING
  RETURNING true INTO v_attempted;

  UPDATE public.orders
  SET restaurant_payout_status = 'initiated',
      restaurant_payout_ref = v_ref,
      restaurant_payout_attempts = CASE WHEN COALESCE(v_attempted, false) THEN COALESCE(restaurant_payout_attempts, 0) + 1 ELSE restaurant_payout_attempts END,
      restaurant_payout_last_error = NULL,
      restaurant_payout_next_retry_at = NULL,
      updated_at = now()
  WHERE id = p_order_id;

  PERFORM public.log_payout_event(p_order_id, 'restaurant', 'initiated', p_idempotency_key, v_ref, NULL, NULL);

  RETURN 'initiated';
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_restaurant_payout(
  p_order_id uuid,
  p_idempotency_key text,
  p_success boolean,
  p_payout_ref text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_ref text;
  v_status text;
  v_attempted boolean := false;
  v_attempt_id bigint;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key required';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.chargeback_flag IS TRUE OR v_order.payment_status IN ('refunded','voided','failed') THEN
    RAISE EXCEPTION 'Payout blocked: payment_status=% or chargeback flag set', v_order.payment_status;
  END IF;

  IF v_order.restaurant_payout_status = 'paid' AND v_order.restaurant_payout_ref IS NOT DISTINCT FROM p_payout_ref THEN
    RETURN 'paid';
  END IF;

  v_ref := COALESCE(p_payout_ref, v_order.restaurant_payout_ref, p_idempotency_key);
  v_status := CASE WHEN p_success THEN 'paid' ELSE 'failed' END;

  SELECT id INTO v_attempt_id
  FROM public.payout_attempts
  WHERE order_id = p_order_id
    AND direction = 'restaurant'
    AND idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_attempt_id IS NULL THEN
    INSERT INTO public.payout_attempts(order_id, direction, idempotency_key, payout_ref, success, error)
    VALUES (p_order_id, 'restaurant', p_idempotency_key, v_ref, p_success, p_error)
    RETURNING id INTO v_attempt_id;
    v_attempted := true;
  ELSE
    UPDATE public.payout_attempts
    SET payout_ref = v_ref, success = p_success, error = p_error, created_at = now()
    WHERE id = v_attempt_id;
  END IF;

  UPDATE public.orders
  SET restaurant_payout_status = v_status,
      restaurant_payout_ref = v_ref,
      restaurant_payout_last_error = CASE WHEN p_success THEN NULL ELSE p_error END,
      restaurant_payout_attempts = CASE
        WHEN p_success THEN restaurant_payout_attempts
        WHEN COALESCE(v_attempted, false) THEN COALESCE(restaurant_payout_attempts,0) + 1
        ELSE restaurant_payout_attempts
      END,
      restaurant_payout_next_retry_at = CASE WHEN p_success THEN NULL ELSE now() + interval '1 hour' END,
      updated_at = now()
  WHERE id = p_order_id;

  PERFORM public.log_payout_event(
    p_order_id,
    'restaurant',
    CASE WHEN p_success THEN 'paid' ELSE 'failed' END,
    p_idempotency_key,
    v_ref,
    p_error,
    NULL
  );

  RETURN v_status;
END;
$$;

-- Driver payout execution with idempotency
CREATE OR REPLACE FUNCTION public.initiate_driver_payout(
  p_order_id uuid,
  p_driver_id uuid,
  p_idempotency_key text,
  p_payout_ref text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_delivery record;
  v_ref text;
  v_attempted boolean;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key required';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT * INTO v_delivery FROM public.deliveries WHERE order_id = p_order_id LIMIT 1;

  IF v_order.chargeback_flag IS TRUE OR v_order.payment_status IN ('refunded','voided','failed') THEN
    RAISE EXCEPTION 'Payout blocked: payment_status=% or chargeback flag set', v_order.payment_status;
  END IF;

  IF v_order.driver_payout_status = 'paid' THEN
    RETURN 'paid';
  END IF;

  IF v_order.payment_status NOT IN ('paid','captured') THEN
    RAISE EXCEPTION 'Order must be paid before driver payout';
  END IF;

  v_ref := COALESCE(p_payout_ref, v_order.driver_payout_ref, p_idempotency_key);

  INSERT INTO public.payout_attempts(order_id, direction, idempotency_key, payout_ref)
  VALUES (p_order_id, 'driver', p_idempotency_key, v_ref)
  ON CONFLICT DO NOTHING
  RETURNING true INTO v_attempted;

  UPDATE public.orders
  SET driver_payout_status = 'initiated',
      driver_payout_ref = v_ref,
      driver_payout_attempts = CASE WHEN COALESCE(v_attempted, false) THEN COALESCE(driver_payout_attempts, 0) + 1 ELSE driver_payout_attempts END,
      driver_payout_last_error = NULL,
      driver_payout_next_retry_at = NULL,
      updated_at = now()
  WHERE id = p_order_id;

  UPDATE public.deliveries
  SET driver_id = COALESCE(p_driver_id, driver_id)
  WHERE id = v_delivery.id;

  PERFORM public.log_payout_event(
    p_order_id,
    'driver',
    'initiated',
    p_idempotency_key,
    v_ref,
    NULL,
    COALESCE(p_driver_id, v_delivery.driver_id)
  );

  RETURN 'initiated';
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_driver_payout(
  p_order_id uuid,
  p_idempotency_key text,
  p_success boolean,
  p_payout_ref text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_delivery record;
  v_ref text;
  v_status text;
  v_attempted boolean := false;
  v_attempt_id bigint;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key required';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  SELECT * INTO v_delivery FROM public.deliveries WHERE order_id = p_order_id LIMIT 1;

  IF v_order.chargeback_flag IS TRUE OR v_order.payment_status IN ('refunded','voided','failed') THEN
    RAISE EXCEPTION 'Payout blocked: payment_status=% or chargeback flag set', v_order.payment_status;
  END IF;

  IF v_order.driver_payout_status = 'paid' AND v_order.driver_payout_ref IS NOT DISTINCT FROM p_payout_ref THEN
    RETURN 'paid';
  END IF;

  v_ref := COALESCE(p_payout_ref, v_order.driver_payout_ref, p_idempotency_key);
  v_status := CASE WHEN p_success THEN 'paid' ELSE 'failed' END;

  SELECT id INTO v_attempt_id
  FROM public.payout_attempts
  WHERE order_id = p_order_id
    AND direction = 'driver'
    AND idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_attempt_id IS NULL THEN
    INSERT INTO public.payout_attempts(order_id, direction, idempotency_key, payout_ref, success, error)
    VALUES (p_order_id, 'driver', p_idempotency_key, v_ref, p_success, p_error)
    RETURNING id INTO v_attempt_id;
    v_attempted := true;
  ELSE
    UPDATE public.payout_attempts
    SET payout_ref = v_ref, success = p_success, error = p_error, created_at = now()
    WHERE id = v_attempt_id;
  END IF;

  UPDATE public.orders
  SET driver_payout_status = v_status,
      driver_payout_ref = v_ref,
      driver_payout_last_error = CASE WHEN p_success THEN NULL ELSE p_error END,
      driver_payout_attempts = CASE
        WHEN p_success THEN driver_payout_attempts
        WHEN COALESCE(v_attempted, false) THEN COALESCE(driver_payout_attempts,0) + 1
        ELSE driver_payout_attempts
      END,
      driver_payout_next_retry_at = CASE WHEN p_success THEN NULL ELSE now() + interval '1 hour' END,
      delivery_fee_paid_at = CASE WHEN p_success THEN now() ELSE delivery_fee_paid_at END,
      updated_at = now()
  WHERE id = p_order_id;

  PERFORM public.log_payout_event(
    p_order_id,
    'driver',
    CASE WHEN p_success THEN 'paid' ELSE 'failed' END,
    p_idempotency_key,
    v_ref,
    p_error,
    v_delivery.driver_id
  );

  RETURN v_status;
END;
$$;

-- Refund / void handling with payout blocks and reversal events
CREATE OR REPLACE FUNCTION public.refund_order_safe(
  p_order_id uuid,
  p_reason text DEFAULT NULL,
  p_actor uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Block if already refunded/voided
  IF v_order.payment_status IN ('refunded','voided','failed') THEN
    RETURN v_order.payment_status;
  END IF;

  -- Recompute ledger for reversal context
  UPDATE public.orders
  SET payment_status = 'refunded',
      restaurant_payout_status = 'failed',
      driver_payout_status = 'failed',
      restaurant_payout_last_error = 'refund_block',
      driver_payout_last_error = 'refund_block',
      platform_fee = 0,
      restaurant_net = 0,
      total_charged = 0,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.delivery_events(order_id, event_type, payload)
  VALUES (
    p_order_id,
    'payment_refunded',
    jsonb_build_object(
      'reason', p_reason,
      'actor', p_actor,
      'ledger_reset', true,
      'old_platform_fee', v_order.platform_fee,
      'old_restaurant_net', v_order.restaurant_net,
      'old_total_charged', v_order.total_charged
    )
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'payment_refunded',
    'orders',
    p_order_id,
    jsonb_build_object(
      'reason', p_reason,
      'ledger_reset', true,
      'old_platform_fee', v_order.platform_fee,
      'old_restaurant_net', v_order.restaurant_net,
      'old_total_charged', v_order.total_charged
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN 'refunded';
END;
$$;

-- Chargeback flag: freeze payouts and log
CREATE OR REPLACE FUNCTION public.flag_chargeback(
  p_order_id uuid,
  p_reason text DEFAULT 'chargeback',
  p_actor uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  UPDATE public.orders
  SET chargeback_flag = true,
      payment_status = 'failed',
      restaurant_payout_status = 'failed',
      driver_payout_status = 'failed',
      restaurant_payout_last_error = 'chargeback',
      driver_payout_last_error = 'chargeback',
      platform_fee = 0,
      restaurant_net = 0,
      total_charged = 0,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.delivery_events(order_id, event_type, payload)
  VALUES (
    p_order_id,
    'chargeback_flagged',
    jsonb_build_object(
      'reason', p_reason,
      'actor', p_actor,
      'ledger_reset', true,
      'old_platform_fee', v_order.platform_fee,
      'old_restaurant_net', v_order.restaurant_net,
      'old_total_charged', v_order.total_charged
    )
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'chargeback_flagged',
    'orders',
    p_order_id,
    jsonb_build_object(
      'reason', p_reason,
      'ledger_reset', true,
      'old_platform_fee', v_order.platform_fee,
      'old_restaurant_net', v_order.restaurant_net,
      'old_total_charged', v_order.total_charged
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN 'chargeback_flagged';
END;
$$;

-- Reroute/Substitution adjustments: void old, reset payouts, recompute ledger, re-collect
CREATE OR REPLACE FUNCTION public.adjust_order_totals_recharge(
  p_order_id uuid,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_tax_amount numeric,
  p_tip_amount numeric,
  p_payment_method text DEFAULT 'instapay'
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_old_total numeric;
  v_new_platform_fee numeric;
  v_new_restaurant_net numeric;
  v_new_total numeric;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  v_old_total := COALESCE(v_order.total_charged, v_order.total, 0);
  v_new_platform_fee := ROUND(COALESCE(p_subtotal,0) * 0.10, 2);
  v_new_restaurant_net := ROUND(COALESCE(p_subtotal,0) + COALESCE(p_tax_amount,0) + COALESCE(p_tip_amount,0) - v_new_platform_fee, 2);
  v_new_total := ROUND(
    COALESCE(p_subtotal,0) +
    COALESCE(p_delivery_fee,0) +
    COALESCE(p_tax_amount,0) +
    COALESCE(p_tip_amount,0) +
    v_new_platform_fee,
    2
  );

  UPDATE public.orders
  SET
    subtotal = p_subtotal,
    delivery_fee = p_delivery_fee,
    tax_amount = p_tax_amount,
    tip_amount = p_tip_amount,
    platform_fee = v_new_platform_fee,
    restaurant_net = v_new_restaurant_net,
    total = v_new_total,
    total_charged = v_new_total,
    payment_status = 'payment_pending',
    payment_method = p_payment_method,
    customer_payment_txn_id = NULL,
    restaurant_payout_status = 'pending',
    restaurant_payout_ref = NULL,
    restaurant_payout_attempts = 0,
    restaurant_payout_last_error = NULL,
    driver_payout_status = 'pending',
    driver_payout_ref = NULL,
    driver_payout_attempts = 0,
    driver_payout_last_error = NULL,
    delivery_fee_paid_at = NULL,
    updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.delivery_events(order_id, event_type, payload)
  VALUES (
    p_order_id,
    'payment_adjusted_totals',
    jsonb_build_object(
      'old_total', v_old_total,
      'new_total', v_new_total,
      'platform_fee', v_new_platform_fee,
      'restaurant_net', v_new_restaurant_net
    )
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'payment_adjusted_totals',
    'orders',
    p_order_id,
    jsonb_build_object(
      'old_total', v_old_total,
      'new_total', v_new_total,
      'platform_fee', v_new_platform_fee,
      'restaurant_net', v_new_restaurant_net
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN 'payment_pending';
END;
$$;

DROP FUNCTION IF EXISTS public.list_restaurant_payables();
DROP FUNCTION IF EXISTS public.list_restaurant_payables(text, uuid, text, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.list_restaurant_payables(
  p_status text DEFAULT NULL,
  p_restaurant_id uuid DEFAULT NULL,
  p_ref text DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL,
  p_created_before timestamptz DEFAULT NULL
)
RETURNS TABLE(
  order_id uuid,
  restaurant_id uuid,
  restaurant_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  payout_method text,
  payout_handle text,
  restaurant_net numeric,
  tip_amount numeric,
  payment_status text,
  restaurant_payout_status text,
  restaurant_payout_last_error text,
  payout_attempts integer,
  payout_ref text,
  expected_restaurant_net numeric,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id AS order_id,
    o.restaurant_id,
    r.name AS restaurant_name,
    u.full_name AS contact_name,
    u.email AS contact_email,
    u.phone AS contact_phone,
    (r.payout_account ->> 'instapayType') AS payout_method,
    (r.payout_account ->> 'instapayHandle') AS payout_handle,
    o.restaurant_net,
    o.tip_amount,
    o.payment_status,
    o.restaurant_payout_status,
    o.restaurant_payout_last_error,
    o.restaurant_payout_attempts,
    o.restaurant_payout_ref,
    COALESCE(o.restaurant_net, 0) AS expected_restaurant_net,
    o.created_at
  FROM public.orders o
  LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
  LEFT JOIN public.users u ON u.id = r.owner_id
  WHERE o.payment_status IN ('paid','captured')
    AND (p_status IS NULL OR o.restaurant_payout_status = p_status)
    AND (p_restaurant_id IS NULL OR o.restaurant_id = p_restaurant_id)
    AND (p_ref IS NULL OR o.restaurant_payout_ref = p_ref)
    AND (p_created_after IS NULL OR o.created_at >= p_created_after)
    AND (p_created_before IS NULL OR o.created_at <= p_created_before)
  ORDER BY o.created_at DESC
  LIMIT 200;
$$;

DROP FUNCTION IF EXISTS public.list_driver_payables();
DROP FUNCTION IF EXISTS public.list_driver_payables(text, uuid, text, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.list_driver_payables(
  p_status text DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL,
  p_ref text DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL,
  p_created_before timestamptz DEFAULT NULL
)
RETURNS TABLE(
  order_id uuid,
  driver_id uuid,
  driver_name text,
  driver_email text,
  driver_phone text,
  driver_payout_handle text,
  payout_method text,
  payout_handle text,
  delivery_fee numeric,
  tip_amount numeric,
  payment_status text,
  driver_payout_status text,
  driver_payout_last_error text,
  payout_attempts integer,
  payout_ref text,
  driver_payable numeric,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.order_id,
    d.driver_id,
    u.full_name AS driver_name,
    u.email AS driver_email,
    u.phone AS driver_phone,
    d.driver_payout_handle,
    (dd.payout_account ->> 'method') AS payout_method,
    (dd.payout_account ->> 'handle') AS payout_handle,
    COALESCE(d.delivery_fee, o.delivery_fee) AS delivery_fee,
    o.tip_amount,
    o.payment_status,
    o.driver_payout_status,
    o.driver_payout_last_error,
    o.driver_payout_attempts,
    o.driver_payout_ref,
    COALESCE(d.delivery_fee, o.delivery_fee, 0) + COALESCE(o.tip_amount, 0) AS driver_payable,
    o.created_at
  FROM public.deliveries d
  JOIN public.orders o ON o.id = d.order_id
  LEFT JOIN public.delivery_drivers dd ON dd.id = d.driver_id
  LEFT JOIN public.users u ON u.id = dd.user_id
  WHERE o.payment_status IN ('paid','captured')
    AND (p_status IS NULL OR o.driver_payout_status = p_status)
    AND (p_driver_id IS NULL OR d.driver_id = p_driver_id)
    AND (p_ref IS NULL OR o.driver_payout_ref = p_ref)
    AND (p_created_after IS NULL OR o.created_at >= p_created_after)
    AND (p_created_before IS NULL OR o.created_at <= p_created_before)
  ORDER BY o.created_at DESC
  LIMIT 200;
$$;

-- Restaurant ledger visibility for console/webhook
DROP FUNCTION IF EXISTS public.list_restaurant_payment_visibility(uuid);
CREATE OR REPLACE FUNCTION public.list_restaurant_payment_visibility(p_restaurant_id uuid)
RETURNS TABLE(
  order_id uuid,
  payment_status text,
  subtotal numeric,
  tax_amount numeric,
  restaurant_net numeric,
  platform_fee numeric,
  delivery_fee numeric,
  tip_amount numeric,
  total_charged numeric,
  driver_payout_status text,
  driver_payout_ref text,
  restaurant_payout_status text,
  restaurant_payout_ref text,
  restaurant_payout_last_error text,
  driver_payout_last_error text,
  receipt_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    o.id,
    o.payment_status,
    o.subtotal,
    o.tax_amount,
    o.restaurant_net,
    o.platform_fee,
    o.delivery_fee,
    o.tip_amount,
    o.total_charged,
    o.driver_payout_status,
    o.driver_payout_ref,
    o.restaurant_payout_status,
    o.restaurant_payout_ref,
    o.restaurant_payout_last_error,
    o.driver_payout_last_error,
    o.receipt_url,
    o.created_at
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
  ORDER BY o.created_at DESC
  LIMIT 200;
$$;

-- Driver payout visibility
DROP FUNCTION IF EXISTS public.list_driver_payout_visibility(uuid);
CREATE OR REPLACE FUNCTION public.list_driver_payout_visibility(p_driver_id uuid)
RETURNS TABLE(
  order_id uuid,
  driver_id uuid,
  delivery_fee numeric,
  tip_amount numeric,
  driver_payable numeric,
  payment_status text,
  driver_payout_status text,
  driver_payout_ref text,
  driver_payout_last_error text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.order_id,
    d.driver_id,
    COALESCE(d.delivery_fee, o.delivery_fee) AS delivery_fee,
    o.tip_amount,
    COALESCE(d.delivery_fee, o.delivery_fee, 0) + COALESCE(o.tip_amount, 0) AS driver_payable,
    o.payment_status,
    o.driver_payout_status,
    o.driver_payout_ref,
    o.driver_payout_last_error,
    o.created_at
  FROM public.deliveries d
  JOIN public.orders o ON o.id = d.order_id
  WHERE d.driver_id = p_driver_id
  ORDER BY o.created_at DESC
  LIMIT 200;
$$;

-- Customer receipt breakdown (includes platform fee line)
CREATE OR REPLACE FUNCTION public.get_order_receipt_breakdown(p_order_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'order_id', o.id,
    'subtotal', o.subtotal,
    'tax_amount', o.tax_amount,
    'tip_amount', o.tip_amount,
    'delivery_fee', o.delivery_fee,
    'platform_fee', o.platform_fee,
    'total_charged', o.total_charged,
  'payment_status', o.payment_status,
  'receipt_url', o.receipt_url,
  'restaurant_net', o.restaurant_net,
  'platform_fee', o.platform_fee,
  'tip_amount', o.tip_amount,
  'delivery_fee', o.delivery_fee
  )
  FROM public.orders o
  WHERE o.id = p_order_id;
$$;

-- Daily settlement report (platform revenue + payables)
DROP FUNCTION IF EXISTS public.daily_settlement_report(int);
CREATE OR REPLACE FUNCTION public.daily_settlement_report(p_days int DEFAULT 1)
RETURNS TABLE(
  platform_fee_collected numeric,
  delivery_fee_pass_through numeric,
  tip_pass_through numeric,
  gross_collected numeric,
  refunds_voids numeric,
  net_collected numeric,
  restaurant_payable_due numeric,
  restaurant_payable_paid numeric,
  restaurant_payable_failed int,
  driver_payable_due numeric,
  driver_payable_paid numeric,
  driver_payable_failed int
)
LANGUAGE sql
STABLE
AS $$
  WITH base AS (
    SELECT * FROM public.orders
    WHERE created_at >= (CURRENT_DATE - (p_days - 1) * INTERVAL '1 day')
  )
  SELECT
    COALESCE(SUM(b.platform_fee) FILTER (WHERE b.payment_status IN ('paid','captured')), 0) AS platform_fee_collected,
    COALESCE(SUM(b.delivery_fee) FILTER (WHERE b.payment_status IN ('paid','captured')), 0) AS delivery_fee_pass_through,
    COALESCE(SUM(b.tip_amount) FILTER (WHERE b.payment_status IN ('paid','captured')), 0) AS tip_pass_through,
    COALESCE(SUM(b.total_charged) FILTER (WHERE b.payment_status IN ('paid','captured')), 0) AS gross_collected,
    COALESCE(SUM(b.total_charged) FILTER (WHERE b.payment_status IN ('refunded','voided')), 0) AS refunds_voids,
    COALESCE(SUM(b.total_charged) FILTER (WHERE b.payment_status IN ('paid','captured')), 0)
      - COALESCE(SUM(b.total_charged) FILTER (WHERE b.payment_status IN ('refunded','voided')), 0) AS net_collected,
    COALESCE(SUM(CASE WHEN b.restaurant_payout_status = 'pending' THEN b.restaurant_net ELSE 0 END), 0) AS restaurant_payable_due,
    COALESCE(SUM(CASE WHEN b.restaurant_payout_status = 'paid' THEN b.restaurant_net ELSE 0 END), 0) AS restaurant_payable_paid,
    COALESCE(SUM(CASE WHEN b.restaurant_payout_status = 'failed' THEN 1 ELSE 0 END), 0) AS restaurant_payable_failed,
    COALESCE(SUM(CASE WHEN b.driver_payout_status = 'pending' THEN COALESCE(b.delivery_fee,0) + COALESCE(b.tip_amount,0) ELSE 0 END), 0) AS driver_payable_due,
    COALESCE(SUM(CASE WHEN b.driver_payout_status = 'paid' THEN COALESCE(b.delivery_fee,0) + COALESCE(b.tip_amount,0) ELSE 0 END), 0) AS driver_payable_paid,
    COALESCE(SUM(CASE WHEN b.driver_payout_status = 'failed' THEN 1 ELSE 0 END), 0) AS driver_payable_failed
  FROM base b;
$$;

-- Aging payables (pending beyond SLA)
CREATE OR REPLACE FUNCTION public.list_aging_payables(p_hours int DEFAULT 24)
RETURNS TABLE(
  order_id uuid,
  payable_type text,
  status text,
  attempts int,
  last_error text,
  created_at timestamptz,
  age_hours numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    o.id AS order_id,
    'restaurant'::text AS payable_type,
    o.restaurant_payout_status AS status,
    o.restaurant_payout_attempts AS attempts,
    o.restaurant_payout_last_error AS last_error,
    o.created_at,
    EXTRACT(EPOCH FROM (now() - o.created_at)) / 3600 AS age_hours
  FROM public.orders o
  WHERE o.restaurant_payout_status = 'pending'
    AND now() - o.created_at > (p_hours || ' hours')::interval
  UNION ALL
  SELECT
    o.id AS order_id,
    'driver'::text AS payable_type,
    o.driver_payout_status AS status,
    o.driver_payout_attempts AS attempts,
    o.driver_payout_last_error AS last_error,
    o.created_at,
    EXTRACT(EPOCH FROM (now() - o.created_at)) / 3600 AS age_hours
  FROM public.orders o
  WHERE o.driver_payout_status = 'pending'
    AND now() - o.created_at > (p_hours || ' hours')::interval
  ORDER BY created_at DESC
  LIMIT 500;
$$;

-- Reconciliation against PSP settlement imports
DROP FUNCTION IF EXISTS public.reconcile_settlement_import(jsonb);
CREATE OR REPLACE FUNCTION public.reconcile_settlement_import(p_rows jsonb)
RETURNS TABLE(
  txn_id text,
  payment_ref text,
  amount numeric,
  settlement_date date,
  channel text,
  match_status text,
  matched_entity text,
  matched_id uuid,
  notes text,
  recon_status text
)
LANGUAGE plpgsql
AS $$
DECLARE
  rec jsonb;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  FOREACH rec IN ARRAY (SELECT jsonb_array_elements(p_rows)) LOOP
    INSERT INTO public.settlement_imports (txn_id, payment_ref, amount, settlement_date, channel)
    VALUES (
      COALESCE(rec->>'txn_id', rec->>'payment_ref', gen_random_uuid()::text),
      rec->>'payment_ref',
      (rec->>'amount')::numeric,
      COALESCE((rec->>'settlement_date')::date, CURRENT_DATE),
      rec->>'channel'
    )
    ON CONFLICT (txn_id) DO UPDATE
      SET payment_ref = EXCLUDED.payment_ref,
          amount = EXCLUDED.amount,
          settlement_date = EXCLUDED.settlement_date,
          channel = COALESCE(EXCLUDED.channel, public.settlement_imports.channel),
          imported_at = now();
  END LOOP;

  WITH matches AS (
    SELECT
      si.id,
      si.txn_id,
      si.payment_ref,
      si.amount,
      si.settlement_date,
      si.channel,
      o.id AS order_id,
      CASE
        WHEN o.customer_payment_txn_id = si.txn_id THEN 'customer_payment'
        WHEN o.restaurant_payout_ref = si.payment_ref THEN 'restaurant_payout'
        WHEN o.driver_payout_ref = si.payment_ref THEN 'driver_payout'
        ELSE NULL
      END AS entity_type
    FROM public.settlement_imports si
    LEFT JOIN public.orders o ON o.customer_payment_txn_id = si.txn_id
      OR o.restaurant_payout_ref = si.payment_ref
      OR o.driver_payout_ref = si.payment_ref
    WHERE si.imported_at >= (now() - interval '2 days')
  ),
  summarized AS (
    SELECT
      id,
      txn_id,
      payment_ref,
      amount,
      settlement_date,
      channel,
      array_remove(array_agg(order_id), NULL) AS order_ids,
      array_remove(array_agg(entity_type), NULL) AS entity_types,
      COUNT(order_id) AS match_count
    FROM matches
    GROUP BY 1,2,3,4,5,6
  ),
  resolved AS (
    SELECT
      s.id,
      s.txn_id,
      s.payment_ref,
      s.amount,
      s.settlement_date,
      s.channel,
      CASE
        WHEN s.match_count = 0 THEN 'unmatched'
        WHEN s.match_count > 1 THEN 'conflict'
        ELSE 'matched'
      END AS match_status,
      CASE
        WHEN s.match_count = 1 THEN s.entity_types[1]
        WHEN s.match_count > 1 THEN 'multiple'
        ELSE NULL
      END AS matched_entity,
      CASE
        WHEN s.match_count = 1 THEN s.order_ids[1]
        ELSE NULL
      END AS matched_id,
      CASE
        WHEN s.match_count = 0 THEN 'No matching order/payment ref'
        WHEN s.match_count > 1 THEN 'Multiple orders matched this reference'
        ELSE NULL
      END AS notes
    FROM summarized s
  ),
  updated AS (
    UPDATE public.settlement_imports si
    SET
      recon_status = r.match_status,
      reconciled_at = now()
    FROM resolved r
    WHERE si.id = r.id
    RETURNING si.id
  )
  SELECT
    r.txn_id,
    r.payment_ref,
    r.amount,
    r.settlement_date,
    r.channel,
    r.match_status,
    r.matched_entity,
    r.matched_id,
    r.notes,
    r.match_status AS recon_status
  FROM resolved r;
END;
$$;

-- Ops playbooks and alerting helpers
CREATE OR REPLACE FUNCTION public.get_ops_playbook()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'mismatched_receipts', jsonb_build_object(
      'steps', ARRAY[
        'Check expected vs reported amount; if mismatch > 0.01, keep in paid_pending_review.',
        'Verify txn_id uniqueness; reject if reused.',
        'If receipt missing/blurred, request re-upload; otherwise approve.',
        'On approve: mark payment_status=paid and add reviewer note (payment_review_notes).',
        'On reject: set payment_status=failed, add reviewer note, and notify customer.'
      ]
    ),
    'payout_failures', jsonb_build_object(
      'steps', ARRAY[
        'Inspect restaurant/driver payout_last_error.',
        'Retry with new idempotency_key; increment attempts.',
        'If bank handle invalid, pause and request correction; document in audit_logs.detail.',
        'Backoff rule: retry hourly for first 3 attempts, then every 6h until manual intervention.',
        'Escalate to finance after 3 failed attempts or 24h pending.',
        'Log every attempt/result in delivery_events + audit_logs.'
      ]
    ),
    'manual_overrides', jsonb_build_object(
      'steps', ARRAY[
        'Only finance role may force payout to paid/failed.',
        'Record actor and reason in audit_logs.',
        'When forcing paid: set payout_ref and idempotency_key used.',
        'When forcing failed: set last_error with cause and leave pending for retry.'
      ]
    ),
    'chargebacks', jsonb_build_object(
      'steps', ARRAY[
        'Set chargeback_flag=true; freeze payouts and zero ledger totals.',
        'Notify finance/recon; tag audit log with actor and reason.',
        'If dispute won: re-enable payouts by clearing chargeback_flag and recalculating ledger.',
        'If dispute lost: keep payouts failed, mark order payment_status=failed, and close audit trail.'
      ]
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_ops_alerts_snapshot(
  p_pending_hours int DEFAULT 24,
  p_failure_rate_cap numeric DEFAULT 0.05
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH recent AS (
    SELECT * FROM public.orders WHERE created_at >= now() - interval '7 days'
  ),
  pending_old AS (
    SELECT
      SUM(CASE WHEN restaurant_payout_status IN ('pending','initiated') AND now() - created_at > (p_pending_hours || ' hours')::interval THEN 1 ELSE 0 END) AS rest_pending_old,
      SUM(CASE WHEN driver_payout_status IN ('pending','initiated') AND now() - created_at > (p_pending_hours || ' hours')::interval THEN 1 ELSE 0 END) AS drv_pending_old
    FROM recent
  ),
  failure_rates AS (
    SELECT
      SUM(CASE WHEN restaurant_payout_status = 'failed' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*),0) AS rest_failure_rate,
      SUM(CASE WHEN driver_payout_status = 'failed' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*),0) AS drv_failure_rate
    FROM recent
  ),
  recon AS (
    SELECT COUNT(*) AS unmatched_recent
    FROM public.settlement_imports si
    LEFT JOIN public.orders o ON o.customer_payment_txn_id = si.txn_id
      OR o.restaurant_payout_ref = si.payment_ref
      OR o.driver_payout_ref = si.payment_ref
    WHERE si.imported_at >= (now() - interval '48 hours')
      AND o.id IS NULL
  ),
  review_backlog AS (
    SELECT COUNT(*) AS pending_review
    FROM public.orders
    WHERE payment_status = 'paid_pending_review'
  ),
  proof_failures AS (
    SELECT COUNT(*) AS proof_rate_limited
    FROM public.orders
    WHERE COALESCE(payment_proof_attempts, 0) >= 5
      AND payment_proof_last_attempt > (now() - interval '24 hours')
  ),
  recon_mismatches AS (
    WITH matches AS (
      SELECT
        si.id,
        si.txn_id,
        si.payment_ref,
        si.channel,
        o.id AS order_id,
        o.restaurant_id
      FROM public.settlement_imports si
      LEFT JOIN public.orders o ON o.customer_payment_txn_id = si.txn_id
        OR o.restaurant_payout_ref = si.payment_ref
        OR o.driver_payout_ref = si.payment_ref
      WHERE si.imported_at >= (now() - interval '48 hours')
    ),
    summarized AS (
      SELECT
        id,
        array_remove(array_agg(order_id), NULL) AS order_ids,
        array_remove(array_agg(restaurant_id), NULL) AS restaurant_ids,
        COUNT(order_id) AS match_count
      FROM matches
      GROUP BY 1
    ),
    resolved AS (
      SELECT
        s.id,
        s.restaurant_ids,
        CASE
          WHEN s.match_count = 0 THEN 'unmatched'
          WHEN s.match_count > 1 THEN 'conflict'
          ELSE 'matched'
        END AS match_status
      FROM summarized s
    )
    SELECT
      COALESCE(rid::text, 'unknown') AS restaurant_id,
      COUNT(*) AS mismatch_count
    FROM resolved r
    LEFT JOIN LATERAL unnest(r.restaurant_ids) rid ON true
    WHERE r.match_status IN ('unmatched','conflict')
    GROUP BY COALESCE(rid::text, 'unknown')
  )
  SELECT jsonb_build_object(
    'pending_beyond_sla', jsonb_build_object(
      'restaurant', COALESCE(pending_old.rest_pending_old,0),
      'driver', COALESCE(pending_old.drv_pending_old,0),
      'threshold_hours', p_pending_hours
    ),
    'payout_failure_rate', jsonb_build_object(
      'restaurant', COALESCE(failure_rates.rest_failure_rate,0),
      'driver', COALESCE(failure_rates.drv_failure_rate,0),
      'cap', p_failure_rate_cap
    ),
    'payment_review_backlog', COALESCE(review_backlog.pending_review, 0),
    'payment_proof_rate_limited_24h', COALESCE(proof_failures.proof_rate_limited, 0),
    'reconciliation_unmatched_48h', COALESCE(recon.unmatched_recent,0),
    'reconciliation_mismatches_by_restaurant', COALESCE((SELECT jsonb_object_agg(restaurant_id, mismatch_count) FROM recon_mismatches), '{}'::jsonb)
  )
  FROM pending_old, failure_rates, recon, review_backlog, proof_failures;
$$;

-- Trusted arrival foundations
CREATE TABLE IF NOT EXISTS public.restaurant_sla (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  prep_p50_minutes integer NOT NULL DEFAULT 12,
  prep_p90_minutes integer NOT NULL DEFAULT 20,
  reliability_score numeric(4,3) NOT NULL DEFAULT 0.90,
  buffer_minutes integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS restaurant_sla_reliability_idx
  ON public.restaurant_sla (reliability_score DESC);

-- Enrich menu items with SKU/external id for mapping
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE INDEX IF NOT EXISTS menu_items_sku_idx ON public.menu_items(sku);
CREATE INDEX IF NOT EXISTS menu_items_external_idx ON public.menu_items(external_id);

CREATE TABLE IF NOT EXISTS public.item_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  substitute_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'same-category',
  max_delta_pct numeric(5,2) DEFAULT 10.00,
  auto_apply boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS item_substitutions_unique
  ON public.item_substitutions (restaurant_id, item_id, substitute_item_id);

CREATE INDEX IF NOT EXISTS item_substitutions_item_idx
  ON public.item_substitutions (item_id);

CREATE TABLE IF NOT EXISTS public.backup_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  backup_restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  priority smallint NOT NULL DEFAULT 1,
  max_distance_km numeric(6,2) DEFAULT 5.00,
  cuisine_match boolean DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS backup_restaurants_unique
  ON public.backup_restaurants (restaurant_id, backup_restaurant_id);

CREATE INDEX IF NOT EXISTS backup_restaurants_pri_idx
  ON public.backup_restaurants (restaurant_id, priority);

-- Explicit mapping between source and backup menu items
CREATE TABLE IF NOT EXISTS public.backup_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  source_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  target_restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  target_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS backup_mappings_unique
  ON public.backup_mappings (source_restaurant_id, source_item_id, target_restaurant_id, target_item_id);

CREATE TABLE IF NOT EXISTS public.delivery_events (
  id bigserial PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.delivery_drivers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delivery_events_order_idx
  ON public.delivery_events (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS delivery_events_driver_idx
  ON public.delivery_events (driver_id, created_at DESC);

-- Order ETA fields and reroute pointer
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS eta_promised timestamptz,
  ADD COLUMN IF NOT EXISTS eta_confidence_low timestamptz,
  ADD COLUMN IF NOT EXISTS eta_confidence_high timestamptz,
  ADD COLUMN IF NOT EXISTS rerouted_from_order_id uuid REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS reroute_status text CHECK (reroute_status IN ('pending','approved','performed','failed'));

CREATE INDEX IF NOT EXISTS orders_eta_promised_idx
  ON public.orders (eta_promised DESC);

CREATE INDEX IF NOT EXISTS orders_rerouted_from_idx
  ON public.orders (rerouted_from_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS orders_rerouted_from_unique
  ON public.orders (rerouted_from_order_id)
  WHERE rerouted_from_order_id IS NOT NULL;

-- Validate ETA writes to prevent spoofing or extreme bands
CREATE OR REPLACE FUNCTION public.validate_order_eta()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.eta_promised IS NULL OR NEW.eta_confidence_low IS NULL OR NEW.eta_confidence_high IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.eta_confidence_low > NEW.eta_confidence_high THEN
    RAISE EXCEPTION 'ETA low cannot exceed ETA high';
  END IF;

  IF NEW.eta_confidence_low > NEW.eta_promised OR NEW.eta_promised > NEW.eta_confidence_high THEN
    RAISE EXCEPTION 'ETA promised must be within the confidence band';
  END IF;

  IF (EXTRACT(EPOCH FROM (NEW.eta_confidence_high - NEW.eta_confidence_low)) / 60) > 45 THEN
    RAISE EXCEPTION 'ETA band too wide';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_eta ON public.orders;
CREATE TRIGGER trg_validate_order_eta
  BEFORE INSERT OR UPDATE OF eta_promised, eta_confidence_low, eta_confidence_high
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_eta();

-- Centralized ETA setter (server-side) to avoid client spoofing
CREATE OR REPLACE FUNCTION public.set_order_eta_from_components(
  p_order_id uuid,
  p_prep_p50 integer,
  p_prep_p90 integer,
  p_buffer integer,
  p_travel_minutes integer,
  p_weather_factor numeric DEFAULT 1,
  p_reliability numeric DEFAULT 0.9
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_eta_low integer;
  v_eta_high integer;
  v_eta_mid integer;
  v_band_width integer;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'order_id required';
  END IF;

  v_eta_low := ROUND((p_prep_p50 + p_buffer) + (p_travel_minutes * p_weather_factor));
  v_eta_high := ROUND((p_prep_p90 + p_buffer + 3) + (p_travel_minutes * p_weather_factor) + 4);
  v_eta_mid := ROUND((v_eta_low + v_eta_high) / 2);
  v_band_width := v_eta_high - v_eta_low;

  IF v_band_width > 45 THEN
    RAISE EXCEPTION 'ETA band too wide from components';
  END IF;

  UPDATE public.orders
  SET
    eta_promised = now() + make_interval(mins => v_eta_mid),
    eta_confidence_low = now() + make_interval(mins => v_eta_low),
    eta_confidence_high = now() + make_interval(mins => v_eta_high)
  WHERE id = p_order_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'eta_set_server',
    'orders',
    p_order_id,
    jsonb_build_object(
      'eta_low', v_eta_low,
      'eta_high', v_eta_high,
      'eta_mid', v_eta_mid,
      'band_width', v_band_width,
      'weather_factor', p_weather_factor,
      'reliability', p_reliability
    )
  );
END;
$$;

-- Validate substitution choice against allowed mapping and price delta
CREATE OR REPLACE FUNCTION public.validate_substitution_choice(
  p_restaurant_id uuid,
  p_original_item_id uuid,
  p_substitute_item_id uuid,
  p_quantity int,
  p_price_delta numeric
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule record;
  v_original_price numeric;
  v_substitute_price numeric;
  v_delta_pct numeric;
  v_expected_delta numeric;
BEGIN
  IF p_restaurant_id IS NULL OR p_original_item_id IS NULL OR p_substitute_item_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_rule
  FROM public.item_substitutions
  WHERE restaurant_id = p_restaurant_id
    AND item_id = p_original_item_id
    AND substitute_item_id = p_substitute_item_id
  LIMIT 1;

  IF v_rule IS NULL THEN
    RETURN false;
  END IF;

  SELECT price INTO v_original_price FROM public.menu_items WHERE id = p_original_item_id;
  SELECT price INTO v_substitute_price FROM public.menu_items WHERE id = p_substitute_item_id;

  IF v_original_price IS NULL OR v_substitute_price IS NULL THEN
    RETURN false;
  END IF;

  v_delta_pct := CASE WHEN v_original_price > 0 THEN ((v_substitute_price - v_original_price) / v_original_price) * 100 ELSE 0 END;
  IF v_rule.max_delta_pct IS NOT NULL AND v_delta_pct > v_rule.max_delta_pct THEN
    RETURN false;
  END IF;

  v_expected_delta := (v_substitute_price - v_original_price) * GREATEST(p_quantity, 1);
  IF p_price_delta IS NOT NULL AND abs(p_price_delta - v_expected_delta) > 0.01 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Guard order item pricing against spoofing (±20% from menu price)
CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  menu_price numeric;
BEGIN
  SELECT price INTO menu_price FROM public.menu_items WHERE id = NEW.menu_item_id;
  IF menu_price IS NULL THEN
    RAISE EXCEPTION 'Menu item not found for order item';
  END IF;

  IF NEW.unit_price <= 0 OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Order item price/quantity must be positive';
  END IF;

  IF NEW.unit_price < menu_price * 0.8 OR NEW.unit_price > menu_price * 1.2 THEN
    RAISE EXCEPTION 'Order item price deviates too much from menu price';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_item_price ON public.order_items;
CREATE TRIGGER trg_validate_order_item_price
  BEFORE INSERT OR UPDATE OF unit_price, quantity, menu_item_id
  ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_item_price();

-- Helper to log driver lag server-side with idempotency
CREATE OR REPLACE FUNCTION public.log_driver_delay_event(p_order_id uuid, p_driver_id uuid, p_last_update timestamptz)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  existing_id bigint;
  idem_key text := 'driver_delay_' || p_order_id::text;
BEGIN
  SELECT id INTO existing_id
  FROM public.delivery_events
  WHERE order_id = p_order_id
    AND event_type = 'driver_delay_detected'
    AND payload->>'idempotency_key' = idem_key
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.delivery_events (order_id, driver_id, event_type, payload)
  VALUES (p_order_id, p_driver_id, 'driver_delay_detected', jsonb_build_object(
    'last_update', p_last_update,
    'idempotency_key', idem_key
  ));

  INSERT INTO public.audit_logs (action, table_name, record_id, detail)
  VALUES ('driver_delay_detected', 'deliveries', p_order_id, jsonb_build_object(
    'driver_id', p_driver_id,
    'last_update', p_last_update
  ));
END;
$$;

-- RPC-style function to update delivery status with safety checks and logging
CREATE OR REPLACE FUNCTION public.update_delivery_status_safe(
  p_delivery_id uuid,
  p_status text,
  p_temp_check_passed boolean DEFAULT null,
  p_temp_check_photo_url text DEFAULT null,
  p_handoff_confirmed boolean DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid;
  v_driver_id uuid;
BEGIN
  SELECT order_id, driver_id INTO v_order_id, v_driver_id FROM public.deliveries WHERE id = p_delivery_id;
  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  IF p_status = 'picked_up' AND (p_temp_check_passed IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'Temp check required before pickup';
  END IF;

  IF p_status = 'delivered' AND (p_handoff_confirmed IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'Handoff confirmation required before delivered';
  END IF;

  UPDATE public.deliveries
    SET status = p_status,
        picked_up_at = CASE WHEN p_status IN ('picked_up','on_the_way') THEN COALESCE(picked_up_at, now()) ELSE picked_up_at END,
        delivered_at = CASE WHEN p_status = 'delivered' THEN now() ELSE delivered_at END,
        updated_at = now()
    WHERE id = p_delivery_id;

  IF p_status = 'picked_up' THEN
    INSERT INTO public.delivery_events(order_id, driver_id, event_type, payload)
    VALUES (v_order_id, v_driver_id, 'temp_check', jsonb_build_object('passed', p_temp_check_passed, 'photo_url', p_temp_check_photo_url));
  ELSIF p_status = 'delivered' THEN
    INSERT INTO public.delivery_events(order_id, driver_id, event_type, payload)
    VALUES (v_order_id, v_driver_id, 'handoff_confirmation', jsonb_build_object('confirmed', p_handoff_confirmed));
  END IF;

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES ('update_delivery_status_safe', 'deliveries', p_delivery_id, jsonb_build_object(
    'status', p_status,
    'order_id', v_order_id,
    'temp_check_passed', p_temp_check_passed,
    'handoff_confirmed', p_handoff_confirmed
  ));
END;
$$;

-- Seed rollout config defaults
INSERT INTO public.trusted_rollout_config(key, config)
VALUES ('trusted_arrival', jsonb_build_object(
  'observe_only', true,
  'substitutions_enabled_for', '[]'::jsonb,
  'reroute_enabled_for', '[]'::jsonb,
  'kill_switch_on_time', 85,
  'kill_switch_reroute_rate', 20,
  'kill_switch_credit_budget', 50
))
ON CONFLICT (key) DO NOTHING;

-- Populate metrics from view (idempotent upsert)
CREATE OR REPLACE FUNCTION public.populate_metrics_trusted_arrival()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.metrics_trusted_arrival (
    restaurant_id, metric_date, on_time_pct, reroute_rate,
    substitution_acceptance, credit_cost, affected_orders, csat_affected, csat_baseline
  )
  SELECT
    restaurant_id, metric_date, on_time_pct, reroute_rate,
    substitution_acceptance, credit_cost, affected_orders, csat_affected, csat_baseline
  FROM public.metrics_trusted_arrival_view
  ON CONFLICT (restaurant_id, metric_date) DO UPDATE
  SET
    on_time_pct = EXCLUDED.on_time_pct,
    reroute_rate = EXCLUDED.reroute_rate,
    substitution_acceptance = EXCLUDED.substitution_acceptance,
    credit_cost = EXCLUDED.credit_cost,
    affected_orders = EXCLUDED.affected_orders,
    csat_affected = EXCLUDED.csat_affected,
    csat_baseline = EXCLUDED.csat_baseline,
    created_at = now();
END;
$$;

-- Kill switch: disable reroute/subs for restaurants breaching thresholds
CREATE OR REPLACE FUNCTION public.apply_trusted_kill_switch()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cfg jsonb;
  on_time_threshold numeric := 85;
  reroute_rate_cap numeric := 20;
  credit_budget numeric := 50;
  offenders text[];
  r record;
  new_cfg jsonb;
BEGIN
  SELECT config INTO cfg FROM public.trusted_rollout_config WHERE key = 'trusted_arrival';
  IF cfg IS NULL THEN
    RETURN;
  END IF;

  on_time_threshold := COALESCE((cfg->>'kill_switch_on_time')::numeric, on_time_threshold);
  reroute_rate_cap := COALESCE((cfg->>'kill_switch_reroute_rate')::numeric, reroute_rate_cap);
  credit_budget := COALESCE((cfg->>'kill_switch_credit_budget')::numeric, credit_budget);

  offenders := ARRAY(
    SELECT restaurant_id
    FROM (
      SELECT
        restaurant_id,
        AVG(on_time_pct) AS avg_on_time,
        AVG(reroute_rate) AS avg_reroute,
        CASE WHEN SUM(affected_orders) > 0 THEN (SUM(credit_cost) / NULLIF(SUM(affected_orders),0)) * 100 ELSE 0 END AS credit_per_100
      FROM public.metrics_trusted_arrival
      WHERE metric_date >= (CURRENT_DATE - INTERVAL '7 days')
      GROUP BY restaurant_id
    ) t
    WHERE (avg_on_time IS NOT NULL AND avg_on_time < on_time_threshold)
       OR (avg_reroute IS NOT NULL AND avg_reroute > reroute_rate_cap)
       OR (credit_per_100 IS NOT NULL AND credit_per_100 > credit_budget)
  );

  IF array_length(offenders,1) IS NULL THEN
    RETURN;
  END IF;

  new_cfg := cfg;
  new_cfg := jsonb_set(
    new_cfg,
    '{reroute_enabled_for}',
    COALESCE((cfg->'reroute_enabled_for') - offenders, '[]'::jsonb)
  );
  new_cfg := jsonb_set(
    new_cfg,
    '{substitutions_enabled_for}',
    COALESCE((cfg->'substitutions_enabled_for') - offenders, '[]'::jsonb)
  );
  new_cfg := jsonb_set(
    new_cfg,
    '{observe_only}',
    'true'::jsonb
  );

  UPDATE public.trusted_rollout_config
  SET config = new_cfg, updated_at = now()
  WHERE key = 'trusted_arrival';

  FOREACH r IN ARRAY offenders LOOP
    INSERT INTO public.audit_logs(action, table_name, record_id, detail)
    VALUES ('trusted_kill_switch', 'trusted_rollout_config', r, jsonb_build_object(
      'reason', 'threshold_breached',
      'restaurant_id', r,
      'on_time_threshold', on_time_threshold,
      'reroute_rate_cap', reroute_rate_cap,
      'credit_budget', credit_budget
    ));
  END LOOP;
END;
$$;

-- Transactional reroute with state machine and mapping enforcement
CREATE OR REPLACE FUNCTION public.reroute_order_safe(p_order_id uuid, p_backup_restaurant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_backup record;
  v_delivery record;
  v_new_order_id uuid;
  v_new_delivery_id uuid;
  v_subtotal numeric := 0;
  v_tax_rate numeric := 0;
  v_delivery_fee numeric := 0;
  v_tip numeric := 0;
  v_tax numeric := 0;
  v_new_platform_fee numeric := 0;
  v_new_restaurant_net numeric := 0;
  v_old_total numeric := 0;
BEGIN
  -- Lock the order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Order already completed';
  END IF;
  IF v_order.reroute_status IN ('approved','performed') THEN
    RAISE EXCEPTION 'Reroute already processed or in progress';
  END IF;

  UPDATE public.orders SET reroute_status = 'approved' WHERE id = p_order_id;

  SELECT * INTO v_backup FROM public.restaurants WHERE id = p_backup_restaurant_id;
  IF NOT FOUND THEN
    UPDATE public.orders SET reroute_status = 'failed' WHERE id = p_order_id;
    RAISE EXCEPTION 'Backup restaurant not found';
  END IF;

  v_delivery_fee := COALESCE(v_backup.delivery_fee, v_order.delivery_fee, 0);
  v_tip := COALESCE(v_order.tip_amount, 0);
  v_old_total := COALESCE(v_order.total, 0);
  IF COALESCE(v_order.subtotal,0) > 0 THEN
    v_tax_rate := COALESCE(v_order.tax_amount, 0) / v_order.subtotal;
  END IF;

  -- Ensure all items have mappings and availability
  PERFORM 1
  FROM public.order_items oi
  LEFT JOIN public.backup_mappings bm ON bm.source_item_id = oi.menu_item_id
    AND bm.source_restaurant_id = v_order.restaurant_id
    AND bm.target_restaurant_id = p_backup_restaurant_id
    AND bm.is_active = true
  LEFT JOIN public.menu_items mi ON mi.id = bm.target_item_id
  WHERE oi.order_id = p_order_id
    AND (bm.id IS NULL OR mi.is_available IS NOT DISTINCT FROM false);

  IF FOUND THEN
    UPDATE public.orders SET reroute_status = 'failed' WHERE id = p_order_id;
    RAISE EXCEPTION 'Mapping missing or item unavailable for reroute';
  END IF;

  -- Compute subtotal from mapped items
  SELECT SUM(oi.quantity * mi.price) INTO v_subtotal
  FROM public.order_items oi
  JOIN public.backup_mappings bm ON bm.source_item_id = oi.menu_item_id
    AND bm.source_restaurant_id = v_order.restaurant_id
    AND bm.target_restaurant_id = p_backup_restaurant_id
    AND bm.is_active = true
  JOIN public.menu_items mi ON mi.id = bm.target_item_id
  WHERE oi.order_id = p_order_id;

  IF v_subtotal IS NULL OR v_subtotal <= 0 THEN
    UPDATE public.orders SET reroute_status = 'failed' WHERE id = p_order_id;
    RAISE EXCEPTION 'Reroute subtotal invalid';
  END IF;

  v_tax := ROUND(v_subtotal * v_tax_rate, 2);
  v_new_platform_fee := ROUND(COALESCE(v_subtotal,0) * 0.10, 2);
  v_new_restaurant_net := ROUND(COALESCE(v_subtotal,0) + COALESCE(v_tax,0) + COALESCE(v_tip,0) - v_new_platform_fee, 2);
  v_new_order_id := NULL;

  INSERT INTO public.orders (
    user_id,
    restaurant_id,
    delivery_address_id,
    delivery_address,
    subtotal,
    delivery_fee,
    tax_amount,
    tip_amount,
    total,
    platform_fee,
    restaurant_net,
    total_charged,
    payment_method,
    delivery_instructions,
    receipt_url,
    status,
    payment_status,
    wallet_capture_status,
    restaurant_payout_status,
    driver_payout_status,
    restaurant_payout_ref,
    driver_payout_ref,
    restaurant_payout_attempts,
    driver_payout_attempts,
    restaurant_payout_last_error,
    driver_payout_last_error,
    restaurant_payout_next_retry_at,
    driver_payout_next_retry_at,
    rerouted_from_order_id
  )
  VALUES (
    v_order.user_id,
    p_backup_restaurant_id,
    v_order.delivery_address_id,
    v_order.delivery_address,
    v_subtotal,
    v_delivery_fee,
    v_tax,
    v_tip,
    ROUND(v_subtotal + v_delivery_fee + v_tax + v_tip, 2),
    v_new_platform_fee,
    v_new_restaurant_net,
    ROUND(v_subtotal + v_delivery_fee + v_tax + v_tip, 2),
    v_order.payment_method,
    v_order.delivery_instructions,
    v_order.receipt_url,
    'pending',
    COALESCE(v_order.payment_status, 'initiated'),
    COALESCE(v_order.wallet_capture_status, 'pending'),
    'pending',
    'pending',
    NULL,
    NULL,
    0,
    0,
    NULL,
    NULL,
    NULL,
    NULL,
    v_order.id
  )
  RETURNING id INTO v_new_order_id;

  -- Adjust payment state: mark original as voided/released, new as initiated/hold
  UPDATE public.orders
  SET payment_status = 'voided',
      wallet_capture_status = 'released',
      updated_at = now()
  WHERE id = p_order_id;

  UPDATE public.orders
  SET payment_status = 'initiated',
      wallet_capture_status = 'pending',
      updated_at = now()
  WHERE id = v_new_order_id;

  INSERT INTO public.delivery_events(order_id, event_type, payload)
  VALUES (
    p_order_id,
    'payment_adjusted_reroute',
    jsonb_build_object(
      'old_total', v_old_total,
      'new_total', ROUND(v_subtotal + v_delivery_fee + v_tax + v_tip, 2),
      'new_order_id', v_new_order_id,
      'payouts_reset', true
    )
  );

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'payment_adjusted_reroute',
    'orders',
    p_order_id,
    jsonb_build_object(
      'old_total', v_old_total,
      'new_total', ROUND(v_subtotal + v_delivery_fee + v_tax + v_tip, 2),
      'new_order_id', v_new_order_id,
      'payouts_reset', true
    )
  );

  -- Handle delivery reassignment
  SELECT * INTO v_delivery FROM public.deliveries WHERE order_id = p_order_id LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    -- Cancel the old delivery if it is still active
    IF v_delivery.status NOT IN ('delivered','cancelled') THEN
      UPDATE public.deliveries
      SET status = 'cancelled',
          cancellation_reason = 'rerouted',
          cancelled_at = now(),
          updated_at = now()
      WHERE id = v_delivery.id;
    END IF;

    -- Create a new delivery, optionally keeping the same driver
    INSERT INTO public.deliveries (
      order_id,
      driver_id,
      pickup_address,
      delivery_address,
      pickup_latitude,
      pickup_longitude,
      delivery_latitude,
      delivery_longitude,
      distance_km,
      estimated_duration_minutes,
      delivery_fee,
      driver_earnings,
      status,
      assigned_at
    )
    VALUES (
      v_new_order_id,
      v_delivery.driver_id,
      v_backup.address,
      v_delivery.delivery_address,
      v_backup.latitude,
      v_backup.longitude,
      v_delivery.delivery_latitude,
      v_delivery.delivery_longitude,
      v_delivery.distance_km,
      v_delivery.estimated_duration_minutes,
      v_delivery.delivery_fee,
      v_delivery.driver_earnings,
      CASE WHEN v_delivery.driver_id IS NOT NULL THEN 'assigned' ELSE 'pending' END,
      CASE WHEN v_delivery.driver_id IS NOT NULL THEN now() ELSE NULL END
    )
    RETURNING id INTO v_new_delivery_id;

    INSERT INTO public.delivery_events(order_id, driver_id, event_type, payload)
    VALUES (
      p_order_id,
      v_delivery.driver_id,
      'reroute_delivery_reassigned',
      jsonb_build_object('old_delivery_id', v_delivery.id, 'new_delivery_id', v_new_delivery_id, 'driver_id', v_delivery.driver_id)
    );
    INSERT INTO public.audit_logs(action, table_name, record_id, detail)
    VALUES (
      'reroute_delivery_reassigned',
      'deliveries',
      v_delivery.id,
      jsonb_build_object('old_delivery_id', v_delivery.id, 'new_delivery_id', v_new_delivery_id, 'driver_id', v_delivery.driver_id)
    );
  END IF;

  INSERT INTO public.order_items (order_id, menu_item_id, quantity, unit_price, total_price, special_instructions)
  SELECT
    v_new_order_id,
    bm.target_item_id,
    oi.quantity,
    mi.price,
    mi.price * oi.quantity,
    oi.special_instructions
  FROM public.order_items oi
  JOIN public.backup_mappings bm ON bm.source_item_id = oi.menu_item_id
    AND bm.source_restaurant_id = v_order.restaurant_id
    AND bm.target_restaurant_id = p_backup_restaurant_id
    AND bm.is_active = true
  JOIN public.menu_items mi ON mi.id = bm.target_item_id
  WHERE oi.order_id = p_order_id;

  UPDATE public.orders SET reroute_status = 'performed' WHERE id = p_order_id;
  RETURN v_new_order_id;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.orders SET reroute_status = 'failed' WHERE id = p_order_id;
  RAISE;
END;
$$;

-- Secure RPC wrapper with idempotency for reroute
CREATE OR REPLACE FUNCTION public.reroute_order_rpc(
  p_order_id uuid,
  p_backup_restaurant_id uuid,
  p_idempotency_key text,
  p_mapping_override jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing record;
  v_new_order_id uuid;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to reroute';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key required';
  END IF;

  -- Short-circuit if this idempotent reroute already recorded
  SELECT payload->>'new_order_id' AS new_order_id
  INTO v_existing
  FROM public.delivery_events
  WHERE order_id = p_order_id
    AND event_type = 'auto_reroute_performed'
    AND payload->>'idempotency_key' = p_idempotency_key
  LIMIT 1;

  IF v_existing.new_order_id IS NOT NULL THEN
    RETURN v_existing.new_order_id::uuid;
  END IF;

  -- Optionally allow overrides for mapping (append temporary mappings)
  IF p_mapping_override IS NOT NULL THEN
    INSERT INTO public.backup_mappings (source_restaurant_id, source_item_id, target_restaurant_id, target_item_id, is_active)
    SELECT
      (p_mapping_override->>'source_restaurant_id')::uuid,
      (p_mapping_override->>'source_item_id')::uuid,
      p_backup_restaurant_id,
      (p_mapping_override->>'target_item_id')::uuid,
      true
    ON CONFLICT DO NOTHING;
  END IF;

  v_new_order_id := public.reroute_order_safe(p_order_id, p_backup_restaurant_id);

  INSERT INTO public.delivery_events(order_id, event_type, payload)
  VALUES (
    p_order_id,
    'auto_reroute_performed',
    jsonb_build_object(
      'new_order_id', v_new_order_id,
      'backup_restaurant_id', p_backup_restaurant_id,
      'idempotency_key', p_idempotency_key
    )
  );

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'auto_reroute_performed',
    'orders',
    p_order_id,
    jsonb_build_object(
      'new_order_id', v_new_order_id,
      'backup_restaurant_id', p_backup_restaurant_id,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN v_new_order_id;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.delivery_events(order_id, event_type, payload)
  VALUES (
    p_order_id,
    'auto_reroute_failed',
    jsonb_build_object('backup_restaurant_id', p_backup_restaurant_id, 'idempotency_key', p_idempotency_key, 'error', SQLERRM)
  );
  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'auto_reroute_failed',
    'orders',
    p_order_id,
    jsonb_build_object('backup_restaurant_id', p_backup_restaurant_id, 'idempotency_key', p_idempotency_key, 'error', SQLERRM)
  );
  RAISE;
END;
$$;

-- Ensure pg_cron exists for scheduled maintenance
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- Schedule daily metrics populate (3:00 AM) and kill switch (3:05 AM) idempotently
DO $$
DECLARE
  v_job_id int;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'trusted_arrival_metrics_daily';
  IF v_job_id IS NULL THEN
    PERFORM cron.schedule('trusted_arrival_metrics_daily', '0 3 * * *', 'SELECT public.populate_metrics_trusted_arrival();');
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'trusted_arrival_kill_switch';
  IF v_job_id IS NULL THEN
    PERFORM cron.schedule('trusted_arrival_kill_switch', '5 3 * * *', 'SELECT public.apply_trusted_kill_switch();');
  END IF;
END;
$$;

-- Upsert rollout config with environment defaults (overrides previous seed)
INSERT INTO public.trusted_rollout_config(key, config, updated_at)
VALUES ('trusted_arrival', jsonb_build_object(
  'observe_only', true,
  'substitutions_enabled_for', '[]'::jsonb,
  'reroute_enabled_for', '[]'::jsonb,
  'kill_switch_on_time', 85,
  'kill_switch_reroute_rate', 20,
  'kill_switch_credit_budget', 50
), now())
ON CONFLICT (key) DO UPDATE
SET config = EXCLUDED.config,
    updated_at = now();
-- Seed starter SLA + substitutions + backups for testing (safe if empty)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.restaurants ORDER BY created_at LIMIT 5 LOOP
    INSERT INTO public.restaurant_sla (restaurant_id, prep_p50_minutes, prep_p90_minutes, reliability_score, buffer_minutes)
    VALUES (r.id, 12, 20, 0.92, 5)
    ON CONFLICT (restaurant_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Sample substitutions: pick first two items per restaurant when available
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT mi.restaurant_id, mi.id AS item_id, mi2.id AS substitute_item_id
    FROM public.menu_items mi
    JOIN public.menu_items mi2 ON mi2.restaurant_id = mi.restaurant_id AND mi2.id <> mi.id
    WHERE mi.restaurant_id IS NOT NULL
    ORDER BY mi.created_at
    LIMIT 10
  LOOP
    INSERT INTO public.item_substitutions (restaurant_id, item_id, substitute_item_id, rule_type, max_delta_pct, auto_apply, notes)
    VALUES (rec.restaurant_id, rec.item_id, rec.substitute_item_id, 'same-category', 10.00, false, 'Starter substitution rule')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Sample backup relationships: pair restaurants with their next available peer
WITH pairs AS (
  SELECT r1.id AS restaurant_id, r2.id AS backup_restaurant_id,
         row_number() OVER (PARTITION BY r1.id ORDER BY r2.created_at) AS rn
  FROM public.restaurants r1
  JOIN public.restaurants r2 ON r1.id <> r2.id
)
INSERT INTO public.backup_restaurants (restaurant_id, backup_restaurant_id, priority, max_distance_km, cuisine_match, is_active)
SELECT restaurant_id, backup_restaurant_id, rn, 5.00, true, true
FROM pairs
WHERE rn <= 2
ON CONFLICT DO NOTHING;

-- Seed backup mappings for restaurant pairs using name matches (safe/no-op if present)
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT
      br.restaurant_id AS source_restaurant_id,
      br.backup_restaurant_id AS target_restaurant_id,
      mi.id AS source_item_id,
      mi2.id AS target_item_id
    FROM public.backup_restaurants br
    JOIN public.menu_items mi ON mi.restaurant_id = br.restaurant_id
    JOIN public.menu_items mi2 ON mi2.restaurant_id = br.backup_restaurant_id
      AND lower(mi2.name) = lower(mi.name)
  LOOP
    INSERT INTO public.backup_mappings (source_restaurant_id, source_item_id, target_restaurant_id, target_item_id, is_active)
    VALUES (rec.source_restaurant_id, rec.source_item_id, rec.target_restaurant_id, rec.target_item_id, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Metrics + rollout config for trusted arrival
CREATE TABLE IF NOT EXISTS public.metrics_trusted_arrival (
  id bigserial PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  on_time_pct numeric(5,2),
  reroute_rate numeric(5,2),
  substitution_acceptance numeric(5,2),
  credit_cost numeric(12,2),
  affected_orders int,
  csat_affected numeric(3,2),
  csat_baseline numeric(3,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS metrics_trusted_arrival_uniq
  ON public.metrics_trusted_arrival (restaurant_id, metric_date);

CREATE INDEX IF NOT EXISTS metrics_trusted_arrival_date_idx
  ON public.metrics_trusted_arrival (metric_date DESC);

CREATE TABLE IF NOT EXISTS public.trusted_rollout_config (
  key text PRIMARY KEY,
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- View to compute daily aggregates from orders/events (can be materialized upstream)
DROP VIEW IF EXISTS public.metrics_trusted_arrival_view;
CREATE OR REPLACE VIEW public.metrics_trusted_arrival_view AS
WITH base AS (
  SELECT
    o.restaurant_id,
    (o.created_at)::date AS metric_date,
    COUNT(*) FILTER (WHERE o.delivered_at IS NOT NULL) AS delivered_orders,
    COUNT(*) FILTER (
      WHERE o.delivered_at IS NOT NULL
        AND o.eta_confidence_high IS NOT NULL
        AND o.delivered_at <= o.eta_confidence_high
    ) AS on_time_orders,
    COALESCE(SUM(CASE WHEN wt.metadata->>'source' = 'delay_credit' THEN wt.amount ELSE 0 END), 0) AS credit_cost,
    COUNT(*) FILTER (WHERE de.event_type = 'auto_reroute_decision' AND (de.payload->>'decision') = 'approve') AS reroute_approvals,
    COUNT(*) FILTER (WHERE de.event_type = 'auto_reroute_decision') AS reroute_events,
    COUNT(*) FILTER (WHERE de.event_type = 'auto_reroute_performed') AS reroute_success,
    COUNT(*) FILTER (WHERE de.event_type = 'auto_reroute_failed') AS reroute_failed,
    COUNT(*) FILTER (WHERE de.event_type = 'substitution_choice' AND (de.payload->>'decision') = 'accept') AS subs_accept,
    COUNT(*) FILTER (WHERE de.event_type = 'substitution_choice') AS subs_events
  FROM public.orders o
  LEFT JOIN public.delivery_events de ON de.order_id = o.id
  LEFT JOIN public.wallet_transactions wt ON wt.order_id = o.id
  GROUP BY 1,2
)
SELECT
  restaurant_id,
  metric_date,
  CASE WHEN delivered_orders > 0 THEN ROUND(on_time_orders::numeric / delivered_orders * 100, 2) ELSE NULL END AS on_time_pct,
  CASE WHEN reroute_events > 0 THEN ROUND(reroute_approvals::numeric / reroute_events * 100, 2) ELSE NULL END AS reroute_rate,
  CASE WHEN (reroute_success + reroute_failed) > 0 THEN ROUND(reroute_success::numeric / (reroute_success + reroute_failed) * 100, 2) ELSE NULL END AS reroute_success_rate,
  CASE WHEN subs_events > 0 THEN ROUND(subs_accept::numeric / subs_events * 100, 2) ELSE NULL END AS substitution_acceptance,
  credit_cost,
  delivered_orders AS affected_orders,
  NULL::numeric AS csat_affected,
  NULL::numeric AS csat_baseline
FROM base;

-- Recreate driver payout visibility with payable breakdown
DROP FUNCTION IF EXISTS public.list_driver_payout_visibility(uuid);
CREATE OR REPLACE FUNCTION public.list_driver_payout_visibility(p_driver_id uuid)
RETURNS TABLE(
  order_id uuid,
  driver_id uuid,
  delivery_fee numeric,
  tip_amount numeric,
  driver_payable numeric,
  payment_status text,
  driver_payout_status text,
  driver_payout_ref text,
  driver_payout_last_error text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.order_id,
    d.driver_id,
    COALESCE(d.delivery_fee, o.delivery_fee) AS delivery_fee,
    o.tip_amount,
    COALESCE(d.delivery_fee, o.delivery_fee, 0) + COALESCE(o.tip_amount, 0) AS driver_payable,
    o.payment_status,
    o.driver_payout_status,
    o.driver_payout_ref,
    o.driver_payout_last_error,
    o.created_at
  FROM public.deliveries d
  JOIN public.orders o ON o.id = d.order_id
  WHERE d.driver_id = p_driver_id
  ORDER BY o.created_at DESC
  LIMIT 200;
$$;

-- Recreate receipt breakdown with ledger clarity
DROP FUNCTION IF EXISTS public.get_order_receipt_breakdown(uuid);
CREATE OR REPLACE FUNCTION public.get_order_receipt_breakdown(p_order_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'order_id', o.id,
    'subtotal', o.subtotal,
    'tax_amount', o.tax_amount,
    'tip_amount', o.tip_amount,
    'delivery_fee', o.delivery_fee,
    'platform_fee', o.platform_fee,
    'restaurant_net', o.restaurant_net,
    'total_charged', o.total_charged,
    'payment_status', o.payment_status,
    'receipt_url', o.receipt_url
  )
  FROM public.orders o
  WHERE o.id = p_order_id;
$$;

-- Admin order detail with ledger and timelines
DROP FUNCTION IF EXISTS public.get_order_admin_detail(uuid);
CREATE OR REPLACE FUNCTION public.get_order_admin_detail(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_order record;
  v_events jsonb;
  v_audits jsonb;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'event_type', de.event_type,
    'payload', de.payload,
    'created_at', de.created_at
  ) ORDER BY de.created_at DESC)
  INTO v_events
  FROM public.delivery_events de
  WHERE de.order_id = p_order_id;

  SELECT jsonb_agg(jsonb_build_object(
    'action', al.action,
    'table_name', al.table_name,
    'record_id', al.record_id,
    'detail', al.detail,
    'created_at', al.created_at
  ) ORDER BY al.created_at DESC)
  INTO v_audits
  FROM public.audit_logs al
  WHERE al.record_id = p_order_id OR al.detail->>'order_id' = p_order_id::text;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'user_id', v_order.user_id,
    'restaurant_id', v_order.restaurant_id,
    'payment_status', v_order.payment_status,
    'restaurant_payout_status', v_order.restaurant_payout_status,
    'driver_payout_status', v_order.driver_payout_status,
    'restaurant_payout_ref', v_order.restaurant_payout_ref,
    'driver_payout_ref', v_order.driver_payout_ref,
    'restaurant_payout_attempts', v_order.restaurant_payout_attempts,
    'driver_payout_attempts', v_order.driver_payout_attempts,
    'restaurant_payout_last_error', v_order.restaurant_payout_last_error,
    'driver_payout_last_error', v_order.driver_payout_last_error,
    'payment_review_notes', v_order.payment_review_notes,
    'ledger', jsonb_build_object(
      'subtotal', v_order.subtotal,
      'tax_amount', v_order.tax_amount,
      'tip_amount', v_order.tip_amount,
      'delivery_fee', v_order.delivery_fee,
      'platform_fee', v_order.platform_fee,
      'restaurant_net', v_order.restaurant_net,
      'total_charged', v_order.total_charged
    ),
    'receipt_url', v_order.receipt_url,
    'customer_payment_txn_id', v_order.customer_payment_txn_id,
    'events', COALESCE(v_events, '[]'::jsonb),
    'audits', COALESCE(v_audits, '[]'::jsonb),
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at
  );
END;
$$;
