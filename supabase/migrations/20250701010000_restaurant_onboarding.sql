/*
  # Restaurant onboarding foundations

  - Add operational flags and KYC/payout placeholders to restaurants
  - Create restaurant_hours table for opening times
  - Policies: owners manage their restaurant and hours; service_role full access
*/

-- Add columns for ops and payouts
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_account jsonb;

CREATE INDEX IF NOT EXISTS idx_restaurants_is_open ON public.restaurants(is_open);

-- Hours table
CREATE TABLE IF NOT EXISTS public.restaurant_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time time,
  close_time time,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.restaurant_hours ENABLE ROW LEVEL SECURITY;

-- Policies for hours
DO $$
BEGIN
  DROP POLICY IF EXISTS "Restaurant owners can manage hours" ON public.restaurant_hours;
  DROP POLICY IF EXISTS "Service role can manage hours" ON public.restaurant_hours;
END $$;

CREATE POLICY "Restaurant owners can manage hours"
  ON public.restaurant_hours
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage hours"
  ON public.restaurant_hours
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role management for restaurants (if not already present)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can manage restaurants" ON public.restaurants;
END $$;

CREATE POLICY "Service role can manage restaurants"
  ON public.restaurants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
