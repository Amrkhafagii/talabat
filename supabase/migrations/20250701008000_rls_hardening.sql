/*
  # RLS hardening for restaurants, orders, and deliveries

  - Add restaurant ownership mapping
  - Restrict restaurant/driver access to their own rows
  - Add service_role policies for backend orchestration
*/

-- Ensure restaurants have an owner for RLS checks
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON public.restaurants(owner_id);

-- Orders: tighten restaurant access and allow service role
DO $$
BEGIN
  DROP POLICY IF EXISTS "Restaurant owners can view their restaurant orders" ON public.orders;
  DROP POLICY IF EXISTS "Restaurant owners can update their restaurant orders" ON public.orders;
END $$;

CREATE POLICY "Restaurant owners can view their restaurant orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can update their restaurant orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
    )
  );

DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can manage orders" ON public.orders;
END $$;

CREATE POLICY "Service role can manage orders"
  ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Order items: align with restaurant ownership and service role
DO $$
BEGIN
  DROP POLICY IF EXISTS "Restaurant owners can view order items for their restaurant" ON public.order_items;
  DROP POLICY IF EXISTS "Service role can manage order items" ON public.order_items;
END $$;

CREATE POLICY "Restaurant owners can view order items for their restaurant"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage order items"
  ON public.order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deliveries: add service role override for orchestration
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

-- Restaurants: allow owners to manage their own row
DO $$
BEGIN
  DROP POLICY IF EXISTS "Restaurant owners can update their restaurant" ON public.restaurants;
END $$;

CREATE POLICY "Restaurant owners can update their restaurant"
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
