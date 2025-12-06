/*
  # Ops alerts for state issues

  - Expose order and delivery state issues views via RPCs
*/

DROP FUNCTION IF EXISTS public.list_order_state_issues();
CREATE OR REPLACE FUNCTION public.list_order_state_issues()
RETURNS TABLE(
  id uuid,
  status text,
  payment_status text,
  wallet_capture_status text,
  receipt_url text,
  restaurant_id uuid,
  user_id uuid,
  created_at timestamptz,
  issue text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, status, payment_status, wallet_capture_status, receipt_url, restaurant_id, user_id, created_at, issue
  FROM public.v_order_state_issues;
$$;

REVOKE ALL ON FUNCTION public.list_order_state_issues() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_order_state_issues() TO authenticated;

DROP FUNCTION IF EXISTS public.list_delivery_state_issues();
CREATE OR REPLACE FUNCTION public.list_delivery_state_issues()
RETURNS TABLE(
  id uuid,
  order_id uuid,
  driver_id uuid,
  status text,
  driver_earnings numeric,
  updated_at timestamptz,
  documents_verified boolean,
  license_document_status text,
  issue text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, order_id, driver_id, status, driver_earnings, updated_at, documents_verified, license_document_status, issue
  FROM public.v_delivery_state_issues;
$$;

REVOKE ALL ON FUNCTION public.list_delivery_state_issues() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_delivery_state_issues() TO authenticated;
