/*
  # Driver claim delivery RPC

  - Allows an authenticated driver to claim an available delivery
  - Enforces that the caller is a delivery user with a driver profile
  - Marks the delivery as assigned and makes the driver unavailable for other jobs
*/

DROP FUNCTION IF EXISTS public.driver_claim_delivery(uuid);
CREATE OR REPLACE FUNCTION public.driver_claim_delivery(
  p_delivery_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver record;
  v_user_type text;
BEGIN
  -- Support user_type at top level or nested under app_metadata
  v_user_type := coalesce(
    current_setting('request.jwt.claim.user_type', true),
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'user_type'),
    ''
  );

  -- Only delivery users can claim jobs
  IF v_user_type <> 'delivery' THEN
    RAISE EXCEPTION 'Only delivery users can claim deliveries';
  END IF;

  SELECT
    dd.id,
    dd.is_online,
    dd.is_available,
    dd.documents_verified,
    dd.license_document_status
  INTO v_driver
  FROM public.delivery_drivers dd
  WHERE dd.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver profile not found';
  END IF;

  IF v_driver.documents_verified IS FALSE OR v_driver.license_document_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Driver is not verified';
  END IF;

  -- Claim the delivery if it is still available
  UPDATE public.deliveries
  SET
    driver_id = v_driver.id,
    status = 'assigned',
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_delivery_id
    AND status = 'available';

  IF NOT FOUND THEN
    RETURN FALSE; -- Already claimed or missing
  END IF;

  -- Make driver unavailable while working this job
  UPDATE public.delivery_drivers
  SET is_available = FALSE
  WHERE id = v_driver.id;

  INSERT INTO public.audit_logs(action, table_name, record_id, actor, detail)
  VALUES (
    'delivery_driver_claimed',
    'deliveries',
    p_delivery_id,
    auth.uid(),
    jsonb_build_object('driver_id', v_driver.id)
  )
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.driver_claim_delivery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_claim_delivery(uuid) TO authenticated;
