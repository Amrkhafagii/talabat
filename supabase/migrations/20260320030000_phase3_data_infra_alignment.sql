/*
  # Phase 3 – Data & Infra Alignment

  - Dedicated payment proof storage + order audit columns
  - Address tags/default helper RPC
  - Wallet status/type coverage and customer top-up proof RPC
  - Order status timeline enrichment + cuisine tag support for restaurant filters
*/

-----------------------------
-- Payment proof storage and audit fields
-----------------------------

-- Private bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket-scoped RLS (users can manage their own uploads; service role full access)
DROP POLICY IF EXISTS "payment-proofs read" ON storage.objects;
CREATE POLICY "payment-proofs read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND (owner = auth.uid() OR auth.role() = 'service_role'));

DROP POLICY IF EXISTS "payment-proofs insert" ON storage.objects;
CREATE POLICY "payment-proofs insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND owner = auth.uid());

DROP POLICY IF EXISTS "payment-proofs update" ON storage.objects;
CREATE POLICY "payment-proofs update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'payment-proofs' AND owner = auth.uid());

DROP POLICY IF EXISTS "payment-proofs delete" ON storage.objects;
CREATE POLICY "payment-proofs delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND owner = auth.uid());

DROP POLICY IF EXISTS "payment-proofs service" ON storage.objects;
CREATE POLICY "payment-proofs service"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'payment-proofs')
  WITH CHECK (bucket_id = 'payment-proofs');

-- Orders: payment proof URL + attribution
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS eta_promised timestamptz,
  ADD COLUMN IF NOT EXISTS eta_confidence_low timestamptz,
  ADD COLUMN IF NOT EXISTS eta_confidence_high timestamptz;

-- Recreate payment proof RPC to populate the new columns
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
      payment_proof_url = COALESCE(p_receipt_url, payment_proof_url, receipt_url),
      payment_proof_uploaded_at = CASE WHEN p_receipt_url IS NOT NULL THEN now() ELSE payment_proof_uploaded_at END,
      payment_proof_uploaded_by = CASE WHEN p_receipt_url IS NOT NULL THEN COALESCE(auth.uid(), payment_proof_uploaded_by) ELSE payment_proof_uploaded_by END,
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
      'amount_diff', v_diff,
      'proof_url', p_receipt_url,
      'actor', auth.uid()
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

-- Payment review queue surface: expose proof URL for consoles
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
  payment_proof_url text,
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
    o.payment_proof_url,
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
    coalesce(o.payment_auto_verified, false) AS auto_verified,
    coalesce(o.payment_txn_duplicate, false) AS txn_id_duplicate,
    o.created_at
  FROM public.orders o
  WHERE o.payment_status IN ('payment_pending','paid_pending_review','paid');
END;
$$;

REVOKE ALL ON FUNCTION public.list_payment_review_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_payment_review_queue() TO authenticated;

-----------------------------
-- Addresses: tags and default helper
-----------------------------

ALTER TABLE public.user_addresses
  ADD COLUMN IF NOT EXISTS tag text;

-- Backfill existing labels into normalized tags
UPDATE public.user_addresses
SET tag = CASE
  WHEN lower(trim(coalesce(label, ''))) IN ('home','work','other') THEN lower(trim(label))
  ELSE 'custom'
END
WHERE tag IS NULL;

ALTER TABLE public.user_addresses ALTER COLUMN tag SET DEFAULT 'other';
ALTER TABLE public.user_addresses ALTER COLUMN tag SET NOT NULL;

ALTER TABLE public.user_addresses DROP CONSTRAINT IF EXISTS user_addresses_tag_check;
ALTER TABLE public.user_addresses
  ADD CONSTRAINT user_addresses_tag_check
  CHECK (tag IN ('home','work','other','custom'));

-- Ensure single default per user
WITH dup_defaults AS (
  SELECT id, user_id, row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) AS rn
  FROM public.user_addresses
  WHERE is_default = true
)
UPDATE public.user_addresses ua
SET is_default = false
FROM dup_defaults dd
WHERE ua.id = dd.id AND dd.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_default_unique
  ON public.user_addresses(user_id)
  WHERE is_default;

-- RPC to atomically set default address for a user
DROP FUNCTION IF EXISTS public.set_default_address(uuid);
CREATE OR REPLACE FUNCTION public.set_default_address(p_address_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  SELECT user_id INTO v_user FROM public.user_addresses WHERE id = p_address_id;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Address not found';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user THEN
    RAISE EXCEPTION 'not authorized to modify this address';
  END IF;

  UPDATE public.user_addresses
  SET is_default = (id = p_address_id),
      updated_at = now()
  WHERE user_id = v_user;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.set_default_address(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_default_address(uuid) TO authenticated;

-----------------------------
-- Wallets: status/type coverage + top-up proof
-----------------------------

ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'commission', 'driver_payout', 'psp_hold', 'psp_capture', 'refund', 'payout_request'));

ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_status_check
  CHECK (status IN ('pending', 'completed', 'failed', 'on_hold', 'reversed', 'processing', 'review'));

DROP FUNCTION IF EXISTS public.submit_wallet_topup_proof(uuid, numeric, text, text);
CREATE OR REPLACE FUNCTION public.submit_wallet_topup_proof(
  p_wallet_id uuid,
  p_amount numeric,
  p_txn_ref text DEFAULT NULL,
  p_receipt_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet record;
  v_txn_id uuid;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE id = p_wallet_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF auth.uid() IS NOT NULL AND v_wallet.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized to submit proof for this wallet';
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, amount, type, status, reference, metadata)
  VALUES (
    p_wallet_id,
    abs(p_amount),
    'deposit',
    'review',
    COALESCE(NULLIF(p_txn_ref, ''), 'wallet_topup_proof'),
    jsonb_build_object(
      'receipt_url', p_receipt_url,
      'txn_ref', p_txn_ref,
      'submitted_by', auth.uid(),
      'submitted_at', now()
    )
  )
  RETURNING id INTO v_txn_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, detail, actor)
  VALUES (
    'wallet_topup_proof',
    'wallet_transactions',
    v_txn_id,
    jsonb_build_object('wallet_id', p_wallet_id, 'amount', p_amount, 'txn_ref', p_txn_ref, 'receipt_url', p_receipt_url),
    auth.uid()
  );

  RETURN v_txn_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_wallet_topup_proof(uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_wallet_topup_proof(uuid, numeric, text, text) TO authenticated;

-----------------------------
-- Order tracking timeline enrichment
-----------------------------

DROP VIEW IF EXISTS public.order_status_timeline;
CREATE VIEW public.order_status_timeline AS
WITH delivery_latest AS (
  SELECT DISTINCT ON (order_id) order_id, status, picked_up_at, delivered_at, updated_at
  FROM public.deliveries
  ORDER BY order_id, created_at DESC
)
SELECT
  o.id AS order_id,
  'pending'::text AS event_type,
  'Order placed'::text AS event_note,
  o.created_at AS created_at,
  o.user_id AS created_by,
  o.eta_confidence_low,
  o.eta_confidence_high,
  o.eta_promised,
  'status'::text AS source
FROM public.orders o

UNION ALL
SELECT o.id, 'confirmed', 'Order confirmed', o.confirmed_at, NULL, o.eta_confidence_low, o.eta_confidence_high, o.eta_promised, 'status'
FROM public.orders o
WHERE o.confirmed_at IS NOT NULL

UNION ALL
SELECT o.id, 'preparing', 'Preparing', COALESCE(o.confirmed_at, o.created_at), NULL, o.eta_confidence_low, o.eta_confidence_high, o.eta_promised, 'status'
FROM public.orders o
WHERE o.confirmed_at IS NOT NULL

UNION ALL
SELECT o.id, 'ready', 'Ready for pickup', o.prepared_at, NULL, o.eta_confidence_low, o.eta_confidence_high, o.eta_promised, 'status'
FROM public.orders o
WHERE o.prepared_at IS NOT NULL

UNION ALL
SELECT o.id, 'picked_up', 'Picked up', COALESCE(o.picked_up_at, dl.picked_up_at), NULL, o.eta_confidence_low, o.eta_confidence_high, o.eta_promised, 'status'
FROM public.orders o
LEFT JOIN delivery_latest dl ON dl.order_id = o.id
WHERE COALESCE(o.picked_up_at, dl.picked_up_at) IS NOT NULL

UNION ALL
SELECT o.id, 'delivered', 'Delivered', COALESCE(o.delivered_at, dl.delivered_at), NULL, o.eta_confidence_low, o.eta_confidence_high, o.eta_promised, 'status'
FROM public.orders o
LEFT JOIN delivery_latest dl ON dl.order_id = o.id
WHERE COALESCE(o.delivered_at, dl.delivered_at) IS NOT NULL

UNION ALL
SELECT o.id, 'cancelled', COALESCE(o.cancellation_reason, 'Cancelled'), o.cancelled_at, NULL, o.eta_confidence_low, o.eta_confidence_high, o.eta_promised, 'status'
FROM public.orders o
WHERE o.cancelled_at IS NOT NULL

UNION ALL
SELECT oe.order_id, oe.event_type, oe.event_note, oe.created_at, oe.created_by, o.eta_confidence_low, o.eta_confidence_high, o.eta_promised, 'event'
FROM public.order_events oe
LEFT JOIN public.orders o ON o.id = oe.order_id

ORDER BY created_at DESC;

GRANT SELECT ON public.order_status_timeline TO authenticated;

-----------------------------
-- Restaurant cuisine tags for filtering
-----------------------------

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS cuisine_tags text[] DEFAULT '{}'::text[];

UPDATE public.restaurants
SET cuisine_tags = ARRAY[lower(trim(cuisine))]
WHERE (cuisine_tags IS NULL OR array_length(cuisine_tags, 1) = 0)
  AND cuisine IS NOT NULL;

CREATE INDEX IF NOT EXISTS restaurants_cuisine_tags_gin
  ON public.restaurants USING GIN (cuisine_tags);
