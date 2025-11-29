/*
  # Integrity and audit

  - Add uniqueness/indexes for addresses and orders
  - Validate distance queries via NOTIFY (lightweight)
  - Add audit log table for critical actions
  - Guard against re-seeding sample data in production
*/

-- Indexes and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_user_label_uniq
  ON public.user_addresses (user_id, label);

CREATE INDEX IF NOT EXISTS orders_user_created_at_idx
  ON public.orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_restaurant_created_at_idx
  ON public.orders (restaurant_id, created_at DESC);

-- Distance validation hook (debugging aid, no-op unless listened)
CREATE OR REPLACE FUNCTION public.log_distance_query(p_lat double precision, p_lng double precision, p_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify('distance_query', jsonb_build_object(
    'lat', p_lat,
    'lng', p_lng,
    'restaurant_id', p_restaurant_id,
    'ts', now()
  )::text);
END;
$$;

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  actor uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_table_idx ON public.audit_logs(table_name, created_at DESC);

-- Guard sample data seeding in production by checking for existing rows
CREATE OR REPLACE FUNCTION public.safe_seed_check(p_table text, p_threshold int DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  existing_count int;
BEGIN
  EXECUTE format('SELECT count(*) FROM %I', p_table) INTO existing_count;
  IF existing_count > p_threshold THEN
    RAISE EXCEPTION 'Seeding aborted: table % exceeds threshold (%)', p_table, p_threshold;
  END IF;
END;
$$;
