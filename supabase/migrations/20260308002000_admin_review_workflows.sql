/*
  # Phase 2 – Admin review workflows

  - Payment proofs: review RPCs already exist; add refund queue for restaurant rejections
  - Menu photos: enforce approved-only visibility for customers while keeping owner/admin access
  - Driver docs: require four documents, add review status/notes, block going online until approved
*/

--------------------------
-- Menu photo enforcement
--------------------------
DO $$
BEGIN
  DROP POLICY IF EXISTS "Menu items are viewable by everyone" ON public.menu_items;
END $$;

-- Customers/public see only approved photos
DO $$
BEGIN
  DROP POLICY IF EXISTS "Menu items visible when photo approved" ON public.menu_items;
END $$;

CREATE POLICY "Menu items visible when photo approved"
  ON public.menu_items
  FOR SELECT
  USING (photo_approval_status = 'approved');

-- Restaurant owners see their own items regardless of approval
DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners can view their menu items" ON public.menu_items;
END $$;

CREATE POLICY "Owners can view their menu items"
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
    )
  );

-- Admin full visibility
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can view all menu items" ON public.menu_items;
END $$;

CREATE POLICY "Admins can view all menu items"
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (coalesce(auth.jwt()->>'user_type','') = 'admin');

-- Service role override
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can manage menu items" ON public.menu_items;
END $$;

CREATE POLICY "Service role can manage menu items"
  ON public.menu_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

--------------------------
-- Driver documents review
--------------------------
ALTER TABLE public.delivery_drivers
  ADD COLUMN IF NOT EXISTS id_front_url text,
  ADD COLUMN IF NOT EXISTS id_back_url text,
  ADD COLUMN IF NOT EXISTS vehicle_document_url text,
  ADD COLUMN IF NOT EXISTS doc_review_status text DEFAULT 'pending' CHECK (doc_review_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS doc_review_notes text,
  ADD COLUMN IF NOT EXISTS doc_reviewed_at timestamptz;

-- Enforce doc approval before going online (extend existing trigger)
CREATE OR REPLACE FUNCTION public.enforce_driver_online()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_online THEN
    IF NEW.documents_verified IS NOT TRUE
       OR NEW.license_document_status IS DISTINCT FROM 'approved'
       OR NEW.doc_review_status IS DISTINCT FROM 'approved'
       OR NEW.payout_account IS NULL
       OR NEW.id_front_url IS NULL
       OR NEW.id_back_url IS NULL
       OR NEW.vehicle_document_url IS NULL
       OR NEW.license_document_url IS NULL THEN
      RAISE EXCEPTION 'Driver must have all documents approved and payout info before going online';
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

-- List pending driver document reviews (includes four docs)
DROP FUNCTION IF EXISTS public.list_driver_doc_reviews();
CREATE OR REPLACE FUNCTION public.list_driver_doc_reviews()
RETURNS TABLE(
  driver_id uuid,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  license_number text,
  license_document_url text,
  id_front_url text,
  id_back_url text,
  vehicle_document_url text,
  doc_review_status text,
  license_document_status text,
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
    dd.id_front_url,
    dd.id_back_url,
    dd.vehicle_document_url,
    dd.doc_review_status,
    dd.license_document_status,
    dd.updated_at
  FROM public.delivery_drivers dd
  LEFT JOIN public.users u ON u.id = dd.user_id
  WHERE (dd.doc_review_status IS NULL OR dd.doc_review_status <> 'approved')
     OR (dd.license_document_status IS NULL OR dd.license_document_status <> 'approved')
  ORDER BY dd.updated_at DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.list_driver_doc_reviews() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_driver_doc_reviews() TO authenticated;

-- Review driver documents: approve/reject with notes
DROP FUNCTION IF EXISTS public.review_driver_license(uuid, text, text, uuid);
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
      doc_review_status = v_decision,
      doc_review_notes = COALESCE(p_notes, doc_review_notes),
      documents_verified = (v_decision = 'approved'),
      license_verified_at = CASE WHEN v_decision = 'approved' THEN now() ELSE NULL END,
      updated_at = now(),
      doc_reviewed_at = now()
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

--------------------------
-- Refund queue for admin
--------------------------
CREATE TABLE IF NOT EXISTS public.order_refund_queue (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','processed','failed')),
  reason text,
  notes text,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

CREATE OR REPLACE FUNCTION public.enqueue_order_refund(
  p_order_id uuid,
  p_reason text DEFAULT NULL,
  p_actor uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_refund_queue(order_id, status, reason, notes, actor)
  VALUES (p_order_id, 'pending', p_reason, p_notes, p_actor)
  ON CONFLICT (order_id) DO UPDATE
    SET status = 'pending',
        reason = EXCLUDED.reason,
        notes = EXCLUDED.notes,
        actor = COALESCE(EXCLUDED.actor, public.order_refund_queue.actor),
        updated_at = now();

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'order_refund_enqueued',
    'orders',
    p_order_id,
    p_actor,
    jsonb_build_object('reason', p_reason, 'notes', p_notes)
  )
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_order_refund(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_order_refund(uuid, text, uuid, text) TO authenticated;
