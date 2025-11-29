/*
  # Add latitude/longitude to restaurants
*/

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS latitude decimal(10,8),
ADD COLUMN IF NOT EXISTS longitude decimal(11,8);
