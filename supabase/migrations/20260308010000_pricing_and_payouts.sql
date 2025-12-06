/*
  # Phase 5 – Pricing & Payout Logic

  - Fee split: driver earns max(30 EGP, 5% of order total); platform fee 10%; restaurant gets the remainder
  - Persist per-order breakdown on capture
  - Admin payout helpers: list balances with Instapay handles, settle balance to zero with a withdrawal entry
*/

-- Recalculate capture logic with explicit splits
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
  platform_fee numeric(12,2);
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

  IF ord.confirmed_at IS NULL THEN
    UPDATE public.orders SET confirmed_at = now() WHERE id = p_order_id;
  END IF;

  -- Already released? return stored amounts
  IF ord.wallet_capture_status = 'released' THEN
    RETURN jsonb_build_object(
      'platform_fee', ord.platform_fee,
      'driver', NULL,
      'restaurant', ord.restaurant_net
    );
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

  -- Splits
  platform_fee := ROUND(COALESCE(ord.total_charged, ord.total) * 0.10, 2);
  driver_amount := COALESCE(p_driver_cut, GREATEST(30, COALESCE(ord.total_charged, ord.total) * 0.05));
  restaurant_amount := COALESCE(ord.total_charged, ord.total) - platform_fee - COALESCE(driver_amount, 0);

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
    WHERE order_id = p_order_id AND reference IN ('platform_fee', 'restaurant_payout', 'driver_payout')
  );

  IF NOT existing_release THEN
    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
    VALUES (customer_wallet, ord.id, platform_fee * -1, 'commission', 'completed', 'platform_fee');

    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
    VALUES (restaurant_wallet, ord.id, restaurant_amount, 'escrow_release', 'completed', 'restaurant_payout');

    IF driver_wallet IS NOT NULL AND driver_amount IS NOT NULL THEN
      INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
      VALUES (driver_wallet, ord.id, driver_amount, 'driver_payout', 'completed', 'driver_payout');
    END IF;

    UPDATE public.wallets SET balance = balance - platform_fee, updated_at = now() WHERE id = customer_wallet;
    UPDATE public.wallets SET balance = balance + restaurant_amount, updated_at = now() WHERE id = restaurant_wallet;
    IF driver_wallet IS NOT NULL AND driver_amount IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + driver_amount, updated_at = now() WHERE id = driver_wallet;
    END IF;
  END IF;

  UPDATE public.orders
  SET payment_status = 'captured',
      wallet_capture_status = 'released',
      commission_amount = platform_fee,
      platform_fee = platform_fee,
      restaurant_net = restaurant_amount,
      updated_at = now()
  WHERE id = ord.id;

  -- Persist driver earnings on delivery if present
  IF delv.id IS NOT NULL THEN
    UPDATE public.deliveries
    SET driver_earnings = driver_amount
    WHERE id = delv.id;
  END IF;

  RETURN jsonb_build_object(
    'platform_fee', platform_fee,
    'driver', driver_amount,
    'restaurant', restaurant_amount
  );
END;
$$;

-- Refund aligned to new splits
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
  platform_fee numeric(12,2);
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

  platform_fee := COALESCE(ord.platform_fee, ROUND(COALESCE(ord.total_charged, ord.total) * 0.10, 2));
  driver_amount := COALESCE((SELECT driver_earnings FROM public.deliveries WHERE order_id = p_order_id LIMIT 1), GREATEST(30, COALESCE(ord.total_charged, ord.total) * 0.05));
  restaurant_amount := COALESCE(ord.restaurant_net, COALESCE(ord.total_charged, ord.total) - platform_fee - COALESCE(driver_amount, 0));

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
    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
    VALUES (customer_wallet, ord.id, COALESCE(ord.total_charged, ord.total), 'refund', 'completed', 'order_refund_customer');
    UPDATE public.wallets SET balance = balance + COALESCE(ord.total_charged, ord.total), updated_at = now() WHERE id = customer_wallet;

    IF restaurant_amount > 0 THEN
      INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
      VALUES (restaurant_wallet, ord.id, restaurant_amount * -1, 'refund', 'completed', 'restaurant_refund');
      UPDATE public.wallets SET balance = balance - restaurant_amount, updated_at = now() WHERE id = restaurant_wallet;
    END IF;

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

  RETURN jsonb_build_object('status', 'refunded');
END;
$$;

-- Views/RPCs for balances and payouts
DROP VIEW IF EXISTS public.v_wallet_balances;
CREATE VIEW public.v_wallet_balances AS
SELECT
  w.user_id,
  w.type AS wallet_type,
  w.balance,
  w.currency
FROM public.wallets w;

DROP FUNCTION IF EXISTS public.list_payout_balances();
CREATE OR REPLACE FUNCTION public.list_payout_balances()
RETURNS TABLE(
  user_id uuid,
  wallet_type text,
  balance numeric,
  instapay_handle text,
  instapay_channel text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH handles AS (
    SELECT
      u.id,
      COALESCE((r.payout_account ->> 'instapayHandle'), (r.payout_account ->> 'handle')) AS handle,
      COALESCE((r.payout_account ->> 'channel'), (r.payout_account ->> 'instapayType')) AS channel,
      'restaurant' AS kind
    FROM public.users u
    JOIN public.restaurants r ON r.owner_id = u.id
    UNION ALL
    SELECT
      u.id,
      COALESCE((d.payout_account ->> 'handle'), (d.payout_account ->> 'instapayHandle')) AS handle,
      COALESCE((d.payout_account ->> 'channel'), (d.payout_account ->> 'instapayType')) AS channel,
      'driver' AS kind
    FROM public.users u
    JOIN public.delivery_drivers d ON d.user_id = u.id
  )
  SELECT
    v.user_id,
    v.wallet_type,
    v.balance,
    h.handle AS instapay_handle,
    h.channel AS instapay_channel
  FROM public.v_wallet_balances v
  LEFT JOIN handles h ON h.id = v.user_id;
$$;

REVOKE ALL ON FUNCTION public.list_payout_balances() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_payout_balances() TO authenticated;

DROP FUNCTION IF EXISTS public.settle_wallet_balance(uuid, text, text);
CREATE OR REPLACE FUNCTION public.settle_wallet_balance(
  p_user_id uuid,
  p_wallet_type text,
  p_instapay_handle text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_id uuid;
  amt numeric;
BEGIN
  SELECT id, balance INTO w_id, amt FROM public.wallets WHERE user_id = p_user_id AND type = p_wallet_type FOR UPDATE;
  IF w_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF amt = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference, metadata)
  VALUES (w_id, NULL, amt * -1, 'withdrawal', 'completed', 'payout', jsonb_build_object('instapay_handle', p_instapay_handle));

  UPDATE public.wallets SET balance = 0, updated_at = now() WHERE id = w_id;

  RETURN amt;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_wallet_balance(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_wallet_balance(uuid, text, text) TO authenticated;
