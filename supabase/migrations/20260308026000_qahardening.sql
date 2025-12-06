/*
  # Phase 8 – QA & Hardening

  - Monitoring views for inconsistent states (orders/deliveries/payments)
  - Helper to log alerts into audit_logs
  - Cleanup backfill for missing driver_earnings on deliveries
*/

-- Backfill driver_earnings on deliveries from orders when missing
UPDATE public.deliveries d
SET driver_earnings = COALESCE(driver_earnings, o.delivery_fee)
FROM public.orders o
WHERE d.order_id = o.id
  AND d.driver_earnings IS NULL;

-- View: orders in suspicious states (e.g., advanced status without paid)
DROP VIEW IF EXISTS public.v_order_state_issues;
CREATE VIEW public.v_order_state_issues AS
SELECT
  o.id,
  o.status,
  o.payment_status,
  o.wallet_capture_status,
  o.receipt_url,
  o.restaurant_id,
  o.user_id,
  o.created_at,
  CASE
    WHEN o.status IN ('confirmed','preparing','ready','picked_up','on_the_way','delivered')
         AND o.payment_status NOT IN ('paid','captured')
      THEN 'advanced_status_unpaid'
    WHEN o.payment_status = 'paid_pending_review' AND o.receipt_url IS NULL
      THEN 'pending_review_missing_receipt'
    WHEN o.payment_status = 'failed' AND o.status NOT IN ('cancelled')
      THEN 'failed_payment_active_order'
    ELSE 'unknown'
  END AS issue
FROM public.orders o
WHERE (
    (o.status IN ('confirmed','preparing','ready','picked_up','on_the_way','delivered') AND o.payment_status NOT IN ('paid','captured'))
    OR (o.payment_status = 'paid_pending_review' AND o.receipt_url IS NULL)
    OR (o.payment_status = 'failed' AND o.status NOT IN ('cancelled'))
);

-- View: deliveries in suspicious states
DROP VIEW IF EXISTS public.v_delivery_state_issues;
CREATE VIEW public.v_delivery_state_issues AS
SELECT
  d.id,
  d.order_id,
  d.driver_id,
  d.status,
  d.driver_earnings,
  d.updated_at,
  dd.documents_verified,
  dd.license_document_status,
  CASE
    WHEN d.status IN ('assigned','picked_up','on_the_way') AND (dd.documents_verified IS NOT TRUE OR dd.license_document_status <> 'approved')
      THEN 'driver_unverified'
    WHEN d.status IN ('assigned','picked_up','on_the_way') AND d.driver_earnings IS NULL
      THEN 'missing_driver_earnings'
    ELSE 'unknown'
  END AS issue
FROM public.deliveries d
LEFT JOIN public.delivery_drivers dd ON dd.id = d.driver_id
WHERE (
    (d.status IN ('assigned','picked_up','on_the_way') AND (dd.documents_verified IS NOT TRUE OR dd.license_document_status <> 'approved'))
    OR (d.status IN ('assigned','picked_up','on_the_way') AND d.driver_earnings IS NULL)
);

-- Helper to log alerts into audit_logs
DROP FUNCTION IF EXISTS public.log_state_alert(text, text, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.log_state_alert(
  p_table text,
  p_issue text,
  p_record_id uuid,
  p_detail jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES ('state_issue', p_table, p_record_id, jsonb_build_object('issue', p_issue, 'detail', p_detail))
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.log_state_alert(text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_state_alert(text, text, uuid, jsonb) TO authenticated;
