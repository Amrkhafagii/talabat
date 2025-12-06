-- Add a delivery radius column so restaurants can configure their service range
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS delivery_radius_km numeric(5,2) DEFAULT 10;

-- Backfill any nulls to a sane default
UPDATE restaurants
SET delivery_radius_km = 10
WHERE delivery_radius_km IS NULL;
