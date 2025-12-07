-- Allow customers to view driver rows for their own orders (for tracking)
-- Drop dependent policy first to avoid dependency errors
DO $$
BEGIN
  DROP POLICY IF EXISTS "Customers can view their driver" ON public.delivery_drivers;
END $$;

DROP FUNCTION IF EXISTS public.customer_can_view_driver(uuid);
CREATE OR REPLACE FUNCTION public.customer_can_view_driver(p_driver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.deliveries d
    JOIN public.orders o ON o.id = d.order_id
    WHERE d.driver_id = p_driver_id
      AND o.user_id = auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.customer_can_view_driver(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_can_view_driver(uuid) TO authenticated;

CREATE POLICY "Customers can view their driver"
  ON public.delivery_drivers
  FOR SELECT
  TO authenticated
  USING (customer_can_view_driver(id));
