/*
  # Wallets and commission handling

  - Create wallets and wallet_transactions tables
  - Add helper RPC to apply commission and mark an order paid (stub without external PSP)
*/

-- Wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  type text NOT NULL CHECK (type IN ('customer', 'restaurant', 'driver')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'commission')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Simple owner policies (adjust as needed for service role)
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
CREATE POLICY "Users can view their own wallet"
  ON public.wallets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view their own wallet transactions"
  ON public.wallet_transactions
  FOR SELECT
  TO authenticated
  USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

-- Helper to upsert a wallet
CREATE OR REPLACE FUNCTION public.ensure_wallet(p_user_id uuid, p_type text, p_currency text DEFAULT 'EGP')
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  w_id uuid;
BEGIN
  SELECT id INTO w_id FROM public.wallets WHERE user_id = p_user_id AND type = p_type;
  IF w_id IS NULL THEN
    INSERT INTO public.wallets (user_id, type, currency)
    VALUES (p_user_id, p_type, p_currency)
    RETURNING id INTO w_id;
  END IF;
  RETURN w_id;
END;
$$;

-- RPC to apply commission (max(10% of order total, 30 EGP)) and mark order paid
CREATE OR REPLACE FUNCTION public.release_order_payment(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  ord RECORD;
  customer_wallet uuid;
  restaurant_wallet uuid;
  commission_amount numeric(12,2);
  net_amount numeric(12,2);
BEGIN
  SELECT * INTO ord FROM public.orders WHERE id = p_order_id;
  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  commission_amount := GREATEST(ord.total * 0.10, 30);
  net_amount := ord.total - commission_amount;

  customer_wallet := public.ensure_wallet(ord.user_id, 'customer', 'EGP');
  restaurant_wallet := public.ensure_wallet(ord.restaurant_id, 'restaurant', 'EGP');

  -- Commission (deducted from customer wallet)
  INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
  VALUES (customer_wallet, ord.id, commission_amount * -1, 'commission', 'completed', 'commission_charge');

  -- Release to restaurant wallet
  INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
  VALUES (restaurant_wallet, ord.id, net_amount, 'escrow_release', 'completed', 'order_payout');

  UPDATE public.wallets SET balance = balance - commission_amount WHERE id = customer_wallet;
  UPDATE public.wallets SET balance = balance + net_amount WHERE id = restaurant_wallet;

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
