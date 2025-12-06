/*
  # Admin approvals for payments, drivers, and menu photos

  - Add admin user type
  - Enforce receipt approval before restaurants accept orders
  - Capture driver license document status for review
  - Require admin approval for menu photos before they are shown to customers
  - Helper RPCs to drive the admin console
*/

-- Allow admin user type on profiles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('customer', 'restaurant', 'delivery', 'admin'));

-- Broad admin access to the core tables used for approvals
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
  DROP POLICY IF EXISTS "Admins can manage all drivers" ON public.delivery_drivers;
  DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.menu_items;
  DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
END $$;

CREATE POLICY "Admins can manage all orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (coalesce(auth.jwt()->>'user_type', '') = 'admin')
  WITH CHECK (coalesce(auth.jwt()->>'user_type', '') = 'admin');

CREATE POLICY "Admins can manage all drivers"
  ON public.delivery_drivers
  FOR ALL
  TO authenticated
  USING (coalesce(auth.jwt()->>'user_type', '') = 'admin')
  WITH CHECK (coalesce(auth.jwt()->>'user_type', '') = 'admin');

CREATE POLICY "Admins can manage all menu items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (coalesce(auth.jwt()->>'user_type', '') = 'admin')
  WITH CHECK (coalesce(auth.jwt()->>'user_type', '') = 'admin');

CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (coalesce(auth.jwt()->>'user_type', '') = 'admin');

-- Driver license document tracking
ALTER TABLE public.delivery_drivers
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS license_document_url text,
  ADD COLUMN IF NOT EXISTS license_document_status text DEFAULT 'pending' CHECK (license_document_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS license_verified_at timestamptz;

ALTER TABLE public.delivery_drivers
  ALTER COLUMN documents_verified SET DEFAULT false;

UPDATE public.delivery_drivers
SET license_document_status = COALESCE(license_document_status, CASE WHEN documents_verified THEN 'approved' ELSE 'pending' END);

-- Menu photo approval gating
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS photo_approval_status text DEFAULT 'approved' CHECK (photo_approval_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS photo_approval_notes text,
  ADD COLUMN IF NOT EXISTS photo_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS photo_reviewer uuid REFERENCES auth.users(id);

UPDATE public.menu_items
SET photo_approval_status = 'approved'
WHERE photo_approval_status IS NULL;

-- Prevent restaurants from accepting orders until payment is approved
CREATE OR REPLACE FUNCTION public.enforce_paid_before_accept()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('confirmed','preparing','ready','picked_up','on_the_way')
     AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'Payment receipt must be approved before accepting the order';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_paid_before_accept ON public.orders;
CREATE TRIGGER trg_enforce_paid_before_accept
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_paid_before_accept();

-- Admin RPCs: driver license review
CREATE OR REPLACE FUNCTION public.list_driver_license_reviews()
RETURNS TABLE(
  driver_id uuid,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  license_number text,
  license_document_url text,
  license_document_status text,
  vehicle_type text,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dd.id AS driver_id,
    dd.user_id,
    u.full_name,
    u.email,
    u.phone,
    dd.license_number,
    dd.license_document_url,
    dd.license_document_status,
    dd.vehicle_type,
    dd.updated_at
  FROM public.delivery_drivers dd
  LEFT JOIN public.users u ON u.id = dd.user_id
  WHERE dd.license_document_status IN ('pending','rejected')
  ORDER BY dd.updated_at DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.list_driver_license_reviews() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_driver_license_reviews() TO authenticated;

CREATE OR REPLACE FUNCTION public.review_driver_license(
  p_driver_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL,
  p_actor uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision text;
BEGIN
  v_decision := lower(p_decision);
  IF v_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  UPDATE public.delivery_drivers
  SET license_document_status = v_decision,
      documents_verified = (v_decision = 'approved'),
      license_verified_at = CASE WHEN v_decision = 'approved' THEN now() ELSE NULL END,
      verification_notes = COALESCE(p_notes, verification_notes),
      updated_at = now()
  WHERE id = p_driver_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'driver_license_review',
    'delivery_drivers',
    p_driver_id,
    p_actor,
    jsonb_build_object('decision', v_decision, 'notes', p_notes)
  )
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.review_driver_license(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_driver_license(uuid, text, text, uuid) TO authenticated;

-- Admin RPCs: menu photo review
CREATE OR REPLACE FUNCTION public.list_menu_photo_reviews()
RETURNS TABLE(
  menu_item_id uuid,
  restaurant_id uuid,
  restaurant_name text,
  name text,
  image text,
  photo_approval_status text,
  photo_approval_notes text,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mi.id AS menu_item_id,
    mi.restaurant_id,
    r.name AS restaurant_name,
    mi.name,
    mi.image,
    mi.photo_approval_status,
    mi.photo_approval_notes,
    mi.updated_at
  FROM public.menu_items mi
  JOIN public.restaurants r ON r.id = mi.restaurant_id
  WHERE mi.photo_approval_status = 'pending'
  ORDER BY mi.updated_at DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.list_menu_photo_reviews() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_menu_photo_reviews() TO authenticated;

CREATE OR REPLACE FUNCTION public.review_menu_photo(
  p_menu_item_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL,
  p_actor uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision text;
BEGIN
  v_decision := lower(p_decision);
  IF v_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  UPDATE public.menu_items
  SET photo_approval_status = v_decision,
      photo_approval_notes = COALESCE(p_notes, photo_approval_notes),
      photo_reviewed_at = now(),
      photo_reviewer = p_actor,
      updated_at = now()
  WHERE id = p_menu_item_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'menu_photo_review',
    'menu_items',
    p_menu_item_id,
    p_actor,
    jsonb_build_object('decision', v_decision, 'notes', p_notes)
  )
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.review_menu_photo(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_menu_photo(uuid, text, text, uuid) TO authenticated;
