/*
  # Payments and wallet flow

  - Normalize payment status values (initiated/hold/captured/refunded/failed/voided)
  - Add wallet capture states (pending/held/released/refunded/failed)
  - Extend wallet transaction types for PSP and payouts
  - Add hold, capture, refund helpers with driver/restaurant splits
  - Keep release_order_payment as a compatibility wrapper
*/

-- Normalize existing payment status values
UPDATE public.orders SET payment_status = 'initiated' WHERE payment_status IS NULL OR payment_status = 'pending';
UPDATE public.orders SET payment_status = 'captured' WHERE payment_status = 'paid';

-- Ensure columns exist for wallet capture and commission
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wallet_capture_status text,
  ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2);

-- Constrain payment_status and wallet_capture_status
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('initiated', 'hold', 'captured', 'refunded', 'failed', 'voided'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_wallet_capture_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_wallet_capture_status_check
  CHECK (wallet_capture_status IS NULL OR wallet_capture_status IN ('pending', 'held', 'released', 'refunded', 'failed'));

ALTER TABLE public.orders ALTER COLUMN payment_status SET DEFAULT 'initiated';
ALTER TABLE public.orders ALTER COLUMN wallet_capture_status SET DEFAULT 'pending';

-- Expand wallet transaction type and status checks
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'commission', 'driver_payout', 'psp_hold', 'psp_capture', 'refund'));

ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_status_check
  CHECK (status IN ('pending', 'completed', 'failed'));

-- Hold payment (PSP auth/hold step)
CREATE OR REPLACE FUNCTION public.hold_order_payment(p_order_id uuid, p_reference text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord RECORD;
  hold_exists boolean;
BEGIN
  SELECT * INTO ord FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Idempotency: if already held/captured/refunded, return current state
  IF ord.wallet_capture_status IN ('held', 'released', 'refunded') THEN
    RETURN jsonb_build_object('status', ord.wallet_capture_status);
  END IF;

  hold_exists := EXISTS (
    SELECT 1 FROM public.wallet_transactions 
    WHERE order_id = p_order_id AND reference = 'psp_hold'
  );

  IF NOT hold_exists THEN
    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference, metadata)
    VALUES (NULL, p_order_id, 0, 'psp_hold', 'pending', 'psp_hold', jsonb_build_object('reference', p_reference));
  END IF;

  UPDATE public.orders
  SET payment_status = 'hold',
      wallet_capture_status = 'held',
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('status', 'held');
END;
$$;

-- Capture payment and split to restaurant/driver with commission
CREATE OR REPLACE FUNCTION public.capture_order_payment(p_order_id uuid, p_driver_cut numeric DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord RECORD;
  rest RECORD;
  delv RECORD;
  driver_user uuid;
  customer_wallet uuid;
  restaurant_wallet uuid;
  driver_wallet uuid;
  commission_amount numeric(12,2);
  driver_amount numeric(12,2);
  restaurant_amount numeric(12,2);
  existing_release boolean;
BEGIN
  SELECT * INTO ord FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF ord.payment_status = 'refunded' THEN
    RAISE EXCEPTION 'Cannot capture refunded order';
  END IF;

  -- Set SLA markers if absent
  IF ord.confirmed_at IS NULL THEN
    UPDATE public.orders SET confirmed_at = now() WHERE id = p_order_id;
  END IF;

  -- Already released? return stored amounts
  IF ord.wallet_capture_status = 'released' THEN
    RETURN jsonb_build_object(
      'commission', ord.commission_amount,
      'driver', NULL,
      'restaurant', ord.total - COALESCE(ord.commission_amount, 0)
    );
  END IF;

  SELECT * INTO rest FROM public.restaurants WHERE id = ord.restaurant_id;
  IF rest IS NULL OR rest.owner_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant owner not set for restaurant %', ord.restaurant_id;
  END IF;

  -- Optional driver
  SELECT d.id, dd.user_id INTO delv FROM public.deliveries d
    JOIN public.delivery_drivers dd ON dd.id = d.driver_id
    WHERE d.order_id = p_order_id
    ORDER BY d.created_at DESC
    LIMIT 1;

  driver_user := delv.user_id;

  commission_amount := GREATEST(ord.total * 0.10, 30);
  driver_amount := COALESCE(p_driver_cut, ord.delivery_fee);
  restaurant_amount := ord.total - commission_amount - COALESCE(driver_amount, 0);

  IF restaurant_amount < 0 THEN
    RAISE EXCEPTION 'Capture would result in negative restaurant payout';
  END IF;

  customer_wallet := public.ensure_wallet(ord.user_id, 'customer', 'EGP');
  restaurant_wallet := public.ensure_wallet(rest.owner_id, 'restaurant', 'EGP');

  IF driver_user IS NOT NULL THEN
    driver_wallet := public.ensure_wallet(driver_user, 'driver', 'EGP');
  END IF;

  existing_release := EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE order_id = p_order_id AND reference IN ('commission_charge', 'order_payout', 'driver_payout')
  );

  IF NOT existing_release THEN
    -- Commission
    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
    VALUES (customer_wallet, ord.id, commission_amount * -1, 'commission', 'completed', 'commission_charge');

    -- Restaurant payout
    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
    VALUES (restaurant_wallet, ord.id, restaurant_amount, 'escrow_release', 'completed', 'order_payout');

    -- Driver payout (optional)
    IF driver_wallet IS NOT NULL AND driver_amount IS NOT NULL THEN
      INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
      VALUES (driver_wallet, ord.id, driver_amount, 'driver_payout', 'completed', 'driver_payout');
    END IF;

    -- Adjust balances
    UPDATE public.wallets SET balance = balance - commission_amount, updated_at = now() WHERE id = customer_wallet;
    UPDATE public.wallets SET balance = balance + restaurant_amount, updated_at = now() WHERE id = restaurant_wallet;
    IF driver_wallet IS NOT NULL AND driver_amount IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + driver_amount, updated_at = now() WHERE id = driver_wallet;
    END IF;
  END IF;

  UPDATE public.orders
  SET payment_status = 'captured',
      wallet_capture_status = 'released',
      commission_amount = commission_amount,
      updated_at = now()
  WHERE id = ord.id;

  RETURN jsonb_build_object(
    'commission', commission_amount,
    'driver', driver_amount,
    'restaurant', restaurant_amount
  );
END;
$$;

-- Refund payment and reverse payouts
CREATE OR REPLACE FUNCTION public.refund_order_payment(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord RECORD;
  rest RECORD;
  delv RECORD;
  driver_user uuid;
  customer_wallet uuid;
  restaurant_wallet uuid;
  driver_wallet uuid;
  commission_amount numeric(12,2);
  driver_amount numeric(12,2);
  restaurant_amount numeric(12,2);
  refund_exists boolean;
BEGIN
  SELECT * INTO ord FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF ord.payment_status = 'refunded' THEN
    RETURN jsonb_build_object('status', 'refunded');
  END IF;

  SELECT * INTO rest FROM public.restaurants WHERE id = ord.restaurant_id;
  IF rest IS NULL OR rest.owner_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant owner not set for restaurant %', ord.restaurant_id;
  END IF;

  SELECT d.id, dd.user_id INTO delv FROM public.deliveries d
    JOIN public.delivery_drivers dd ON dd.id = d.driver_id
    WHERE d.order_id = p_order_id
    ORDER BY d.created_at DESC
    LIMIT 1;

  driver_user := delv.user_id;

  commission_amount := COALESCE(ord.commission_amount, GREATEST(ord.total * 0.10, 30));
  driver_amount := ord.delivery_fee;
  restaurant_amount := ord.total - commission_amount - COALESCE(driver_amount, 0);

  customer_wallet := public.ensure_wallet(ord.user_id, 'customer', 'EGP');
  restaurant_wallet := public.ensure_wallet(rest.owner_id, 'restaurant', 'EGP');
  IF driver_user IS NOT NULL THEN
    driver_wallet := public.ensure_wallet(driver_user, 'driver', 'EGP');
  END IF;

  refund_exists := EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE order_id = p_order_id AND reference IN ('order_refund_customer', 'restaurant_refund', 'driver_refund')
  );

  IF NOT refund_exists THEN
    -- Refund customer the full total
    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
    VALUES (customer_wallet, ord.id, ord.total, 'refund', 'completed', 'order_refund_customer');
    UPDATE public.wallets SET balance = balance + ord.total, updated_at = now() WHERE id = customer_wallet;

    -- Reverse restaurant payout
    IF restaurant_amount > 0 THEN
      INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
      VALUES (restaurant_wallet, ord.id, restaurant_amount * -1, 'refund', 'completed', 'restaurant_refund');
      UPDATE public.wallets SET balance = balance - restaurant_amount, updated_at = now() WHERE id = restaurant_wallet;
    END IF;

    -- Reverse driver payout
    IF driver_wallet IS NOT NULL AND driver_amount > 0 THEN
      INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
      VALUES (driver_wallet, ord.id, driver_amount * -1, 'refund', 'completed', 'driver_refund');
      UPDATE public.wallets SET balance = balance - driver_amount, updated_at = now() WHERE id = driver_wallet;
    END IF;
  END IF;

  UPDATE public.orders
  SET payment_status = 'refunded',
      wallet_capture_status = 'refunded',
      updated_at = now()
  WHERE id = ord.id;

  RETURN jsonb_build_object(
    'status', 'refunded',
    'commission', commission_amount,
    'driver', driver_amount,
    'restaurant', restaurant_amount
  );
END;
$$;

-- Compatibility wrapper for existing callers
CREATE OR REPLACE FUNCTION public.release_order_payment(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.capture_order_payment(p_order_id, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.hold_order_payment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_order_payment(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_order_payment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_order_payment(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.hold_order_payment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.capture_order_payment(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_order_payment(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_payment(uuid) TO service_role;
