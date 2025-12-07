/*
  # Phase 5 – Data and backend alignment

  - Short display codes for orders
  - Deterministic sort ordering for categories and menu items
  - Wallet feed view with credit/debit direction and UI bucketting
  - RPC helpers to pause/resume restaurant ordering (online toggle)
*/

-- Order short codes (fallback to last 6 of UUID)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS short_code text;

CREATE OR REPLACE FUNCTION public.set_order_short_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.short_code := COALESCE(NULLIF(NEW.order_number, ''), upper(right(NEW.id::text, 6)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_short_code ON public.orders;
CREATE TRIGGER trg_orders_short_code
BEFORE INSERT OR UPDATE OF order_number ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_short_code();

-- Backfill existing rows
UPDATE public.orders
SET short_code = COALESCE(NULLIF(order_number, ''), upper(right(id::text, 6)))
WHERE short_code IS NULL;

-- Category sort order defaults (per restaurant/global scope)
CREATE OR REPLACE FUNCTION public.assign_category_sort_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_next int;
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), -1) + 1
    INTO v_next
    FROM public.categories c
    WHERE c.restaurant_id IS NOT DISTINCT FROM NEW.restaurant_id;

    NEW.sort_order := v_next;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_category_sort_order ON public.categories;
CREATE TRIGGER trg_category_sort_order
BEFORE INSERT ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.assign_category_sort_order();

-- Menu item sort order defaults (per restaurant + category)
CREATE OR REPLACE FUNCTION public.assign_menu_item_sort_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_next int;
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), -1) + 1
    INTO v_next
    FROM public.menu_items mi
    WHERE mi.restaurant_id IS NOT DISTINCT FROM NEW.restaurant_id
      AND (
        (NEW.category_id IS NULL AND mi.category_id IS NULL)
        OR (NEW.category_id IS NOT NULL AND mi.category_id = NEW.category_id)
      );

    NEW.sort_order := v_next;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_menu_item_sort_order ON public.menu_items;
CREATE TRIGGER trg_menu_item_sort_order
BEFORE INSERT ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.assign_menu_item_sort_order();

-- Wallet feed view: credit/debit direction, bucket classification, and order short codes
DROP VIEW IF EXISTS public.v_wallet_feed;
CREATE VIEW public.v_wallet_feed AS
SELECT
  wt.*,
  COALESCE(o.short_code, upper(right(wt.order_id::text, 6))) AS order_short_code,
  o.payment_status AS order_payment_status,
  CASE
    WHEN wt.type IN ('withdrawal', 'payout_request', 'commission', 'psp_hold') OR wt.amount < 0 THEN 'debit'
    ELSE 'credit'
  END AS direction,
  CASE
    WHEN wt.type IN ('withdrawal', 'payout_request') THEN 'payouts'
    WHEN wt.type IN ('escrow_release', 'deposit', 'psp_capture', 'refund', 'driver_payout') THEN 'earnings'
    WHEN wt.type IN ('escrow_hold', 'psp_hold', 'commission') THEN 'hold'
    ELSE CASE WHEN wt.amount < 0 THEN 'payouts' ELSE 'earnings' END
  END AS bucket
FROM public.wallet_transactions wt
LEFT JOIN public.orders o ON o.id = wt.order_id;

GRANT SELECT ON public.v_wallet_feed TO authenticated, service_role;

-- RPC helpers for pause/resume online toggle
CREATE OR REPLACE FUNCTION public.set_restaurant_online(p_restaurant_id uuid, p_is_open boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.restaurants WHERE id = p_restaurant_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found';
  END IF;

  IF auth.uid() IS NOT NULL AND v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.restaurants
  SET is_open = p_is_open, updated_at = now()
  WHERE id = p_restaurant_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.set_restaurant_online(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_restaurant_online(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.pause_restaurant_orders(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.set_restaurant_online(p_restaurant_id, false);
$$;

CREATE OR REPLACE FUNCTION public.resume_restaurant_orders(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.set_restaurant_online(p_restaurant_id, true);
$$;

REVOKE ALL ON FUNCTION public.pause_restaurant_orders(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resume_restaurant_orders(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pause_restaurant_orders(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_restaurant_orders(uuid) TO authenticated;
