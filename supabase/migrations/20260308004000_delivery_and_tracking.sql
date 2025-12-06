/*
  # Phase 4 – Delivery & Tracking

  - Lock delivery creation to service_role/backend
  - Add RPCs for server-side delivery creation/assignment and driver decline
  - Expose driver location to customers for live tracking (read-only)
*/

--------------------------
-- RLS hardening: deliveries
--------------------------
DO $$
BEGIN
  DROP POLICY IF EXISTS "System can create deliveries" ON public.deliveries;
END $$;

-- Inserts only via service_role (backend)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can insert deliveries" ON public.deliveries;
END $$;

CREATE POLICY "Service role can insert deliveries"
  ON public.deliveries
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Drivers can read deliveries assigned to them or available
DO $$
BEGIN
  DROP POLICY IF EXISTS "Drivers can view available deliveries" ON public.deliveries;
  DROP POLICY IF EXISTS "Drivers can view available or assigned deliveries" ON public.deliveries;
END $$;

CREATE POLICY "Drivers can view available or assigned deliveries"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    status = 'available'
    OR driver_id IN (
      SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()
    )
  );

-- Drivers can update only their assigned deliveries
DO $$
BEGIN
  DROP POLICY IF EXISTS "Drivers can update their assigned deliveries" ON public.deliveries;
END $$;

CREATE POLICY "Drivers can update their assigned deliveries"
  ON public.deliveries
  FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid()
    )
  );

-- Restaurants/customers can view their own delivery row
DO $$
BEGIN
  DROP POLICY IF EXISTS "Customers can view their order delivery" ON public.deliveries;
END $$;

CREATE POLICY "Customers can view their order delivery"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  DROP POLICY IF EXISTS "Restaurants can view their order delivery" ON public.deliveries;
END $$;

CREATE POLICY "Restaurants can view their order delivery"
  ON public.deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND r.owner_id = auth.uid()
    )
  );

-- Service role full control
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can manage deliveries" ON public.deliveries;
END $$;

CREATE POLICY "Service role can manage deliveries"
  ON public.deliveries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins (auth) can manage deliveries via app console
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can manage deliveries" ON public.deliveries;
END $$;

CREATE POLICY "Admins can manage deliveries"
  ON public.deliveries
  FOR ALL
  TO authenticated
  USING (coalesce(current_setting('request.jwt.claim.user_type', true), '') = 'admin')
  WITH CHECK (coalesce(current_setting('request.jwt.claim.user_type', true), '') = 'admin');

-- Restaurants can create/update deliveries for their own orders (needed for auto-assign on ready)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Restaurants can insert deliveries for their orders" ON public.deliveries;
END $$;

CREATE POLICY "Restaurants can insert deliveries for their orders"
  ON public.deliveries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND r.owner_id = auth.uid()
    )
  );

DO $$
BEGIN
  DROP POLICY IF EXISTS "Restaurants can update their deliveries" ON public.deliveries;
END $$;

CREATE POLICY "Restaurants can update their deliveries"
  ON public.deliveries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND r.owner_id = auth.uid()
    )
  );

--------------------------
-- RPC: create & assign delivery (backend)
--------------------------
DROP FUNCTION IF EXISTS public.create_and_assign_delivery(uuid, uuid, uuid, text, text, jsonb);
CREATE OR REPLACE FUNCTION public.create_and_assign_delivery(
  p_order_id uuid,
  p_driver_id uuid DEFAULT NULL,
  p_actor uuid DEFAULT NULL,
  p_pickup_address text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_delivery_id uuid;
BEGIN
  -- Ensure only service_role can call
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only service role may create deliveries';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status NOT IN ('ready','confirmed','preparing') THEN
    RAISE EXCEPTION 'Order must be accepted before creating delivery';
  END IF;

  INSERT INTO public.deliveries(
    order_id,
    driver_id,
    pickup_address,
    delivery_address,
    distance,
    estimated_time,
    delivery_fee,
    status,
    assigned_at,
    pickup_latitude,
    pickup_longitude,
    delivery_latitude,
    delivery_longitude
  ) VALUES (
    p_order_id,
    p_driver_id,
    COALESCE(p_pickup_address, v_order.delivery_address, 'Pending pickup'),
    COALESCE(p_delivery_address, v_order.delivery_address, 'Pending dropoff'),
    (p_meta ->> 'distance')::text,
    (p_meta ->> 'eta')::text,
    COALESCE((p_meta ->> 'delivery_fee')::numeric, v_order.delivery_fee),
    CASE WHEN p_driver_id IS NULL THEN 'available' ELSE 'assigned' END,
    CASE WHEN p_driver_id IS NULL THEN NULL ELSE now() END,
    (p_meta ->> 'pickup_latitude')::decimal,
    (p_meta ->> 'pickup_longitude')::decimal,
    (p_meta ->> 'delivery_latitude')::decimal,
    (p_meta ->> 'delivery_longitude')::decimal
  )
  RETURNING id INTO v_delivery_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'delivery_created',
    'deliveries',
    v_delivery_id,
    p_actor,
    jsonb_build_object('order_id', p_order_id, 'driver_id', p_driver_id, 'meta', p_meta)
  )
  ON CONFLICT DO NOTHING;

  RETURN v_delivery_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_and_assign_delivery(uuid, uuid, uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_and_assign_delivery(uuid, uuid, uuid, text, text, jsonb) TO service_role;

--------------------------
-- RPC: driver decline delivery
--------------------------
DROP FUNCTION IF EXISTS public.driver_decline_delivery(uuid, uuid);
CREATE OR REPLACE FUNCTION public.driver_decline_delivery(
  p_delivery_id uuid,
  p_driver_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  SELECT id INTO v_driver_id FROM public.delivery_drivers WHERE user_id = p_driver_user_id;
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Driver profile not found';
  END IF;

  UPDATE public.deliveries
  SET driver_id = NULL,
      status = 'available',
      updated_at = now(),
      cancellation_reason = 'driver_declined'
  WHERE id = p_delivery_id
    AND driver_id = v_driver_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'delivery_driver_declined',
    'deliveries',
    p_delivery_id,
    p_driver_user_id,
    jsonb_build_object('driver_id', v_driver_id)
  )
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.driver_decline_delivery(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_decline_delivery(uuid, uuid) TO authenticated;
