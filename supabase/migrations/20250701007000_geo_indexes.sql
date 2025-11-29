/*
  # Add geo-related indexes

  - Composite index on restaurant latitude/longitude for distance-based lookups
*/

CREATE INDEX IF NOT EXISTS restaurants_latitude_longitude_idx
  ON public.restaurants (latitude, longitude);
