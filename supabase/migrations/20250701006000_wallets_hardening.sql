/*
  # Harden wallets and payouts

  - Add uniqueness + indexes
  - Add RLS policies for writes
  - Make release_order_payment transactional, idempotent, and SECURITY DEFINER
*/

-- Uniqueness and indexes
ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_user_type_key UNIQUE (user_id, type);

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx
  ON public.wallet_transactions (wallet_id);

-- RLS: allow users to create their own wallets, but prevent arbitrary balance edits
CREATE POLICY "Users can insert their own wallet"
  ON public.wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage wallets (for system payouts)
CREATE POLICY "Service role can manage wallets"
  ON public.wallets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can manage wallet transactions (users already have SELECT policy)
CREATE POLICY "Service role can manage wallet transactions"
  ON public.wallet_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Transactional + idempotent payout
CREATE OR REPLACE FUNCTION public.release_order_payment(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord RECORD;
  customer_wallet uuid;
  restaurant_wallet uuid;
  commission_amount numeric(12,2);
  net_amount numeric(12,2);
  existing_commission numeric(12,2);
  existing_payout numeric(12,2);
BEGIN
  -- Lock the order to prevent concurrent releases
  SELECT * INTO ord FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Idempotency: if already released, return stored values
  IF ord.wallet_capture_status = 'released' THEN
    RETURN jsonb_build_object(
      'commission', ord.commission_amount,
      'net', ord.total - COALESCE(ord.commission_amount, 0)
    );
  END IF;

  -- Ensure the order is paid before release
  IF ord.payment_status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'Cannot release payment for unpaid order';
  END IF;

  -- Compute amounts
  commission_amount := GREATEST(ord.total * 0.10, 30);
  net_amount := ord.total - commission_amount;

  -- Idempotency: if transactions already exist, return without re-applying
  SELECT SUM(amount) INTO existing_commission
  FROM public.wallet_transactions
  WHERE order_id = ord.id AND reference = 'commission_charge';

  SELECT SUM(amount) INTO existing_payout
  FROM public.wallet_transactions
  WHERE order_id = ord.id AND reference = 'order_payout';

  IF existing_commission IS NOT NULL OR existing_payout IS NOT NULL THEN
    RETURN jsonb_build_object(
      'commission', commission_amount,
      'net', net_amount
    );
  END IF;

  -- Ensure wallets exist
  customer_wallet := public.ensure_wallet(ord.user_id, 'customer', 'EGP');
  restaurant_wallet := public.ensure_wallet(ord.restaurant_id, 'restaurant', 'EGP');

  -- Apply transactions
  INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
  VALUES (customer_wallet, ord.id, commission_amount * -1, 'commission', 'completed', 'commission_charge');

  INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
  VALUES (restaurant_wallet, ord.id, net_amount, 'escrow_release', 'completed', 'order_payout');

  -- Update balances
  UPDATE public.wallets SET balance = balance - commission_amount, updated_at = now() WHERE id = customer_wallet;
  UPDATE public.wallets SET balance = balance + net_amount, updated_at = now() WHERE id = restaurant_wallet;

  -- Mark order as released
  UPDATE public.orders
  SET payment_status = 'paid',
      wallet_capture_status = 'released',
      commission_amount = commission_amount,
      updated_at = now()
  WHERE id = ord.id;

  RETURN jsonb_build_object(
    'commission', commission_amount,
    'net', net_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_order_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_order_payment(uuid) TO service_role;
