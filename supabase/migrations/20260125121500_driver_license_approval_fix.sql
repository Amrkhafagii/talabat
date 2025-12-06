/*
  # Driver license approval fixes

  - When admins approve a license, also mark background_check_status = 'approved'
  - Keep documents_verified consistent
  - Backfill existing rows where documents_verified is true
*/

-- Backfill any rows where documents are verified but background check is not approved
UPDATE public.delivery_drivers
SET background_check_status = 'approved'
WHERE documents_verified IS TRUE
  AND background_check_status IS DISTINCT FROM 'approved';

-- Recreate review_driver_license to set background_check_status
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
      documents_verified = (v_decision = 'approved'),
      background_check_status = CASE WHEN v_decision = 'approved' THEN 'approved' ELSE 'rejected' END,
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
