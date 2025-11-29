/*
  # Driver onboarding & payouts

  - Add payout info and stronger verification gating on drivers
  - Add delivery payout status tracking
  - Add RLS for driver profile management and service role
  - Add idempotent driver payout helper for completed deliveries
*/

-- Driver payout + verification fields
ALTER TABLE public.delivery_drivers
  ADD COLUMN IF NOT EXISTS payout_account jsonb,
  ADD COLUMN IF NOT EXISTS verification_notes text;

-- Delivery payout tracking
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending' CHECK (payout_status IN ('pending','paid','failed')),
  ADD COLUMN IF NOT EXISTS payout_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_deliveries_payout_status ON public.deliveries(payout_status);

-- RLS: drivers manage their own profile; service role full control
DO $$
BEGIN
  DROP POLICY IF EXISTS "Driver can manage own profile" ON public.delivery_drivers;
  DROP POLICY IF EXISTS "Service role can manage drivers" ON public.delivery_drivers;
END $$;

CREATE POLICY "Driver can manage own profile"
  ON public.delivery_drivers
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage drivers"
  ON public.delivery_drivers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enforce verification before going online
CREATE OR REPLACE FUNCTION public.enforce_driver_online()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_online THEN
    IF NEW.background_check_status IS DISTINCT FROM 'approved'
       OR NEW.documents_verified IS NOT TRUE
       OR NEW.payout_account IS NULL THEN
      RAISE EXCEPTION 'Driver must be verified and have payout info before going online';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_driver_online ON public.delivery_drivers;
CREATE TRIGGER trg_enforce_driver_online
  BEFORE UPDATE ON public.delivery_drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_driver_online();

-- Driver payout helper (idempotent)
CREATE OR REPLACE FUNCTION public.payout_driver_delivery(p_delivery_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delv RECORD;
  driver_wallet uuid;
  existing numeric;
BEGIN
  SELECT d.*, dd.user_id AS driver_user_id
  INTO delv
  FROM public.deliveries d
  JOIN public.delivery_drivers dd ON dd.id = d.driver_id
  WHERE d.id = p_delivery_id
  FOR UPDATE;

  IF delv IS NULL THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  IF delv.status IS DISTINCT FROM 'delivered' THEN
    RAISE EXCEPTION 'Delivery must be delivered before payout';
  END IF;

  IF delv.payout_status = 'paid' THEN
    RETURN jsonb_build_object('status', 'paid');
  END IF;

  existing := (
    SELECT SUM(amount) FROM public.wallet_transactions
    WHERE order_id = delv.order_id AND reference = 'driver_delivery_payout'
  );

  driver_wallet := public.ensure_wallet(delv.driver_user_id, 'driver', 'EGP');

  IF existing IS NULL THEN
    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, status, reference)
    VALUES (driver_wallet, delv.order_id, delv.driver_earnings, 'driver_payout', 'completed', 'driver_delivery_payout');

    UPDATE public.wallets
    SET balance = balance + delv.driver_earnings, updated_at = now()
    WHERE id = driver_wallet;
  END IF;

  UPDATE public.deliveries
  SET payout_status = 'paid',
      payout_at = now(),
      updated_at = now()
  WHERE id = delv.id;

  RETURN jsonb_build_object('status', 'paid', 'amount', delv.driver_earnings);
END;
$$;

REVOKE ALL ON FUNCTION public.payout_driver_delivery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payout_driver_delivery(uuid) TO service_role;
