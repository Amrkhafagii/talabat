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

-- Trusted arrival foundations
CREATE TABLE IF NOT EXISTS public.restaurant_sla (
  restaurant_id uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  prep_p50_minutes integer NOT NULL DEFAULT 12,
  prep_p90_minutes integer NOT NULL DEFAULT 20,
  reliability_score numeric(4,3) NOT NULL DEFAULT 0.90,
  buffer_minutes integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS restaurant_sla_reliability_idx
  ON public.restaurant_sla (reliability_score DESC);

-- Enrich menu items with SKU/external id for mapping
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE INDEX IF NOT EXISTS menu_items_sku_idx ON public.menu_items(sku);
CREATE INDEX IF NOT EXISTS menu_items_external_idx ON public.menu_items(external_id);

CREATE TABLE IF NOT EXISTS public.item_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  substitute_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'same-category',
  max_delta_pct numeric(5,2) DEFAULT 10.00,
  auto_apply boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS item_substitutions_unique
  ON public.item_substitutions (restaurant_id, item_id, substitute_item_id);

CREATE INDEX IF NOT EXISTS item_substitutions_item_idx
  ON public.item_substitutions (item_id);

CREATE TABLE IF NOT EXISTS public.backup_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  backup_restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  priority smallint NOT NULL DEFAULT 1,
  max_distance_km numeric(6,2) DEFAULT 5.00,
  cuisine_match boolean DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS backup_restaurants_unique
  ON public.backup_restaurants (restaurant_id, backup_restaurant_id);

CREATE INDEX IF NOT EXISTS backup_restaurants_pri_idx
  ON public.backup_restaurants (restaurant_id, priority);

-- Explicit mapping between source and backup menu items
CREATE TABLE IF NOT EXISTS public.backup_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  source_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  target_restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  target_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS backup_mappings_unique
  ON public.backup_mappings (source_restaurant_id, source_item_id, target_restaurant_id, target_item_id);

CREATE TABLE IF NOT EXISTS public.delivery_events (
  id bigserial PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.delivery_drivers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delivery_events_order_idx
  ON public.delivery_events (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS delivery_events_driver_idx
  ON public.delivery_events (driver_id, created_at DESC);

-- Order ETA fields and reroute pointer
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS eta_promised timestamptz,
  ADD COLUMN IF NOT EXISTS eta_confidence_low timestamptz,
  ADD COLUMN IF NOT EXISTS eta_confidence_high timestamptz,
  ADD COLUMN IF NOT EXISTS rerouted_from_order_id uuid REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS reroute_status text CHECK (reroute_status IN ('pending','approved','performed','failed'));

CREATE INDEX IF NOT EXISTS orders_eta_promised_idx
  ON public.orders (eta_promised DESC);

CREATE INDEX IF NOT EXISTS orders_rerouted_from_idx
  ON public.orders (rerouted_from_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS orders_rerouted_from_unique
  ON public.orders (rerouted_from_order_id)
  WHERE rerouted_from_order_id IS NOT NULL;

-- Validate ETA writes to prevent spoofing or extreme bands
CREATE OR REPLACE FUNCTION public.validate_order_eta()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.eta_promised IS NULL OR NEW.eta_confidence_low IS NULL OR NEW.eta_confidence_high IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.eta_confidence_low > NEW.eta_confidence_high THEN
    RAISE EXCEPTION 'ETA low cannot exceed ETA high';
  END IF;

  IF NEW.eta_confidence_low > NEW.eta_promised OR NEW.eta_promised > NEW.eta_confidence_high THEN
    RAISE EXCEPTION 'ETA promised must be within the confidence band';
  END IF;

  IF (EXTRACT(EPOCH FROM (NEW.eta_confidence_high - NEW.eta_confidence_low)) / 60) > 45 THEN
    RAISE EXCEPTION 'ETA band too wide';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_eta ON public.orders;
CREATE TRIGGER trg_validate_order_eta
  BEFORE INSERT OR UPDATE OF eta_promised, eta_confidence_low, eta_confidence_high
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_eta();

-- Centralized ETA setter (server-side) to avoid client spoofing
CREATE OR REPLACE FUNCTION public.set_order_eta_from_components(
  p_order_id uuid,
  p_prep_p50 integer,
  p_prep_p90 integer,
  p_buffer integer,
  p_travel_minutes integer,
  p_weather_factor numeric DEFAULT 1,
  p_reliability numeric DEFAULT 0.9
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_eta_low integer;
  v_eta_high integer;
  v_eta_mid integer;
  v_band_width integer;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'order_id required';
  END IF;

  v_eta_low := ROUND((p_prep_p50 + p_buffer) + (p_travel_minutes * p_weather_factor));
  v_eta_high := ROUND((p_prep_p90 + p_buffer + 3) + (p_travel_minutes * p_weather_factor) + 4);
  v_eta_mid := ROUND((v_eta_low + v_eta_high) / 2);
  v_band_width := v_eta_high - v_eta_low;

  IF v_band_width > 45 THEN
    RAISE EXCEPTION 'ETA band too wide from components';
  END IF;

  UPDATE public.orders
  SET
    eta_promised = now() + make_interval(mins => v_eta_mid),
    eta_confidence_low = now() + make_interval(mins => v_eta_low),
    eta_confidence_high = now() + make_interval(mins => v_eta_high)
  WHERE id = p_order_id;

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'eta_set_server',
    'orders',
    p_order_id,
    jsonb_build_object(
      'eta_low', v_eta_low,
      'eta_high', v_eta_high,
      'eta_mid', v_eta_mid,
      'band_width', v_band_width,
      'weather_factor', p_weather_factor,
      'reliability', p_reliability
    )
  );
END;
$$;

-- Validate substitution choice against allowed mapping and price delta
CREATE OR REPLACE FUNCTION public.validate_substitution_choice(
  p_restaurant_id uuid,
  p_original_item_id uuid,
  p_substitute_item_id uuid,
  p_quantity int,
  p_price_delta numeric
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule record;
  v_original_price numeric;
  v_substitute_price numeric;
  v_delta_pct numeric;
  v_expected_delta numeric;
BEGIN
  IF p_restaurant_id IS NULL OR p_original_item_id IS NULL OR p_substitute_item_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_rule
  FROM public.item_substitutions
  WHERE restaurant_id = p_restaurant_id
    AND item_id = p_original_item_id
    AND substitute_item_id = p_substitute_item_id
  LIMIT 1;

  IF v_rule IS NULL THEN
    RETURN false;
  END IF;

  SELECT price INTO v_original_price FROM public.menu_items WHERE id = p_original_item_id;
  SELECT price INTO v_substitute_price FROM public.menu_items WHERE id = p_substitute_item_id;

  IF v_original_price IS NULL OR v_substitute_price IS NULL THEN
    RETURN false;
  END IF;

  v_delta_pct := CASE WHEN v_original_price > 0 THEN ((v_substitute_price - v_original_price) / v_original_price) * 100 ELSE 0 END;
  IF v_rule.max_delta_pct IS NOT NULL AND v_delta_pct > v_rule.max_delta_pct THEN
    RETURN false;
  END IF;

  v_expected_delta := (v_substitute_price - v_original_price) * GREATEST(p_quantity, 1);
  IF p_price_delta IS NOT NULL AND abs(p_price_delta - v_expected_delta) > 0.01 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Guard order item pricing against spoofing (±20% from menu price)
CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  menu_price numeric;
BEGIN
  SELECT price INTO menu_price FROM public.menu_items WHERE id = NEW.menu_item_id;
  IF menu_price IS NULL THEN
    RAISE EXCEPTION 'Menu item not found for order item';
  END IF;

  IF NEW.unit_price <= 0 OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Order item price/quantity must be positive';
  END IF;

  IF NEW.unit_price < menu_price * 0.8 OR NEW.unit_price > menu_price * 1.2 THEN
    RAISE EXCEPTION 'Order item price deviates too much from menu price';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_item_price ON public.order_items;
CREATE TRIGGER trg_validate_order_item_price
  BEFORE INSERT OR UPDATE OF unit_price, quantity, menu_item_id
  ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_item_price();

-- Helper to log driver lag server-side with idempotency
CREATE OR REPLACE FUNCTION public.log_driver_delay_event(p_order_id uuid, p_driver_id uuid, p_last_update timestamptz)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  existing_id bigint;
  idem_key text := 'driver_delay_' || p_order_id::text;
BEGIN
  SELECT id INTO existing_id
  FROM public.delivery_events
  WHERE order_id = p_order_id
    AND event_type = 'driver_delay_detected'
    AND payload->>'idempotency_key' = idem_key
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.delivery_events (order_id, driver_id, event_type, payload)
  VALUES (p_order_id, p_driver_id, 'driver_delay_detected', jsonb_build_object(
    'last_update', p_last_update,
    'idempotency_key', idem_key
  ));

  INSERT INTO public.audit_logs (action, table_name, record_id, detail)
  VALUES ('driver_delay_detected', 'deliveries', p_order_id, jsonb_build_object(
    'driver_id', p_driver_id,
    'last_update', p_last_update
  ));
END;
$$;

-- RPC-style function to update delivery status with safety checks and logging
CREATE OR REPLACE FUNCTION public.update_delivery_status_safe(
  p_delivery_id uuid,
  p_status text,
  p_temp_check_passed boolean DEFAULT null,
  p_temp_check_photo_url text DEFAULT null,
  p_handoff_confirmed boolean DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid;
  v_driver_id uuid;
BEGIN
  SELECT order_id, driver_id INTO v_order_id, v_driver_id FROM public.deliveries WHERE id = p_delivery_id;
  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  IF p_status = 'picked_up' AND (p_temp_check_passed IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'Temp check required before pickup';
  END IF;

  IF p_status = 'delivered' AND (p_handoff_confirmed IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'Handoff confirmation required before delivered';
  END IF;

  UPDATE public.deliveries
    SET status = p_status,
        picked_up_at = CASE WHEN p_status IN ('picked_up','on_the_way') THEN COALESCE(picked_up_at, now()) ELSE picked_up_at END,
        delivered_at = CASE WHEN p_status = 'delivered' THEN now() ELSE delivered_at END,
        updated_at = now()
    WHERE id = p_delivery_id;

  IF p_status = 'picked_up' THEN
    INSERT INTO public.delivery_events(order_id, driver_id, event_type, payload)
    VALUES (v_order_id, v_driver_id, 'temp_check', jsonb_build_object('passed', p_temp_check_passed, 'photo_url', p_temp_check_photo_url));
  ELSIF p_status = 'delivered' THEN
    INSERT INTO public.delivery_events(order_id, driver_id, event_type, payload)
    VALUES (v_order_id, v_driver_id, 'handoff_confirmation', jsonb_build_object('confirmed', p_handoff_confirmed));
  END IF;

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES ('update_delivery_status_safe', 'deliveries', p_delivery_id, jsonb_build_object(
    'status', p_status,
    'order_id', v_order_id,
    'temp_check_passed', p_temp_check_passed,
    'handoff_confirmed', p_handoff_confirmed
  ));
END;
$$;

-- Seed rollout config defaults
INSERT INTO public.trusted_rollout_config(key, config)
VALUES ('trusted_arrival', jsonb_build_object(
  'observe_only', true,
  'substitutions_enabled_for', '[]'::jsonb,
  'reroute_enabled_for', '[]'::jsonb,
  'kill_switch_on_time', 85,
  'kill_switch_reroute_rate', 20,
  'kill_switch_credit_budget', 50
))
ON CONFLICT (key) DO NOTHING;

-- Populate metrics from view (idempotent upsert)
CREATE OR REPLACE FUNCTION public.populate_metrics_trusted_arrival()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.metrics_trusted_arrival (
    restaurant_id, metric_date, on_time_pct, reroute_rate,
    substitution_acceptance, credit_cost, affected_orders, csat_affected, csat_baseline
  )
  SELECT
    restaurant_id, metric_date, on_time_pct, reroute_rate,
    substitution_acceptance, credit_cost, affected_orders, csat_affected, csat_baseline
  FROM public.metrics_trusted_arrival_view
  ON CONFLICT (restaurant_id, metric_date) DO UPDATE
  SET
    on_time_pct = EXCLUDED.on_time_pct,
    reroute_rate = EXCLUDED.reroute_rate,
    substitution_acceptance = EXCLUDED.substitution_acceptance,
    credit_cost = EXCLUDED.credit_cost,
    affected_orders = EXCLUDED.affected_orders,
    csat_affected = EXCLUDED.csat_affected,
    csat_baseline = EXCLUDED.csat_baseline,
    created_at = now();
END;
$$;

-- Kill switch: disable reroute/subs for restaurants breaching thresholds
CREATE OR REPLACE FUNCTION public.apply_trusted_kill_switch()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cfg jsonb;
  on_time_threshold numeric := 85;
  reroute_rate_cap numeric := 20;
  credit_budget numeric := 50;
  offenders text[];
  r record;
  new_cfg jsonb;
BEGIN
  SELECT config INTO cfg FROM public.trusted_rollout_config WHERE key = 'trusted_arrival';
  IF cfg IS NULL THEN
    RETURN;
  END IF;

  on_time_threshold := COALESCE((cfg->>'kill_switch_on_time')::numeric, on_time_threshold);
  reroute_rate_cap := COALESCE((cfg->>'kill_switch_reroute_rate')::numeric, reroute_rate_cap);
  credit_budget := COALESCE((cfg->>'kill_switch_credit_budget')::numeric, credit_budget);

  offenders := ARRAY(
    SELECT restaurant_id
    FROM (
      SELECT
        restaurant_id,
        AVG(on_time_pct) AS avg_on_time,
        AVG(reroute_rate) AS avg_reroute,
        CASE WHEN SUM(affected_orders) > 0 THEN (SUM(credit_cost) / NULLIF(SUM(affected_orders),0)) * 100 ELSE 0 END AS credit_per_100
      FROM public.metrics_trusted_arrival
      WHERE metric_date >= (CURRENT_DATE - INTERVAL '7 days')
      GROUP BY restaurant_id
    ) t
    WHERE (avg_on_time IS NOT NULL AND avg_on_time < on_time_threshold)
       OR (avg_reroute IS NOT NULL AND avg_reroute > reroute_rate_cap)
       OR (credit_per_100 IS NOT NULL AND credit_per_100 > credit_budget)
  );

  IF array_length(offenders,1) IS NULL THEN
    RETURN;
  END IF;

  new_cfg := cfg;
  new_cfg := jsonb_set(
    new_cfg,
    '{reroute_enabled_for}',
    COALESCE((cfg->'reroute_enabled_for') - offenders, '[]'::jsonb)
  );
  new_cfg := jsonb_set(
    new_cfg,
    '{substitutions_enabled_for}',
    COALESCE((cfg->'substitutions_enabled_for') - offenders, '[]'::jsonb)
  );
  new_cfg := jsonb_set(
    new_cfg,
    '{observe_only}',
    'true'::jsonb
  );

  UPDATE public.trusted_rollout_config
  SET config = new_cfg, updated_at = now()
  WHERE key = 'trusted_arrival';

  FOREACH r IN ARRAY offenders LOOP
    INSERT INTO public.audit_logs(action, table_name, record_id, detail)
    VALUES ('trusted_kill_switch', 'trusted_rollout_config', r, jsonb_build_object(
      'reason', 'threshold_breached',
      'restaurant_id', r,
      'on_time_threshold', on_time_threshold,
      'reroute_rate_cap', reroute_rate_cap,
      'credit_budget', credit_budget
    ));
  END LOOP;
END;
$$;

-- Transactional reroute with state machine and mapping enforcement
CREATE OR REPLACE FUNCTION public.reroute_order_safe(p_order_id uuid, p_backup_restaurant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_order record;
  v_backup record;
  v_delivery record;
  v_new_order_id uuid;
  v_new_delivery_id uuid;
  v_subtotal numeric := 0;
  v_tax_rate numeric := 0;
  v_delivery_fee numeric := 0;
  v_tip numeric := 0;
  v_tax numeric := 0;
  v_old_total numeric := 0;
BEGIN
  -- Lock the order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Order already completed';
  END IF;
  IF v_order.reroute_status IN ('approved','performed') THEN
    RAISE EXCEPTION 'Reroute already processed or in progress';
  END IF;

  UPDATE public.orders SET reroute_status = 'approved' WHERE id = p_order_id;

  SELECT * INTO v_backup FROM public.restaurants WHERE id = p_backup_restaurant_id;
  IF NOT FOUND THEN
    UPDATE public.orders SET reroute_status = 'failed' WHERE id = p_order_id;
    RAISE EXCEPTION 'Backup restaurant not found';
  END IF;

  v_delivery_fee := COALESCE(v_backup.delivery_fee, v_order.delivery_fee, 0);
  v_tip := COALESCE(v_order.tip_amount, 0);
  v_old_total := COALESCE(v_order.total, 0);
  IF COALESCE(v_order.subtotal,0) > 0 THEN
    v_tax_rate := COALESCE(v_order.tax_amount, 0) / v_order.subtotal;
  END IF;

  -- Ensure all items have mappings and availability
  PERFORM 1
  FROM public.order_items oi
  LEFT JOIN public.backup_mappings bm ON bm.source_item_id = oi.menu_item_id
    AND bm.source_restaurant_id = v_order.restaurant_id
    AND bm.target_restaurant_id = p_backup_restaurant_id
    AND bm.is_active = true
  LEFT JOIN public.menu_items mi ON mi.id = bm.target_item_id
  WHERE oi.order_id = p_order_id
    AND (bm.id IS NULL OR mi.is_available IS NOT DISTINCT FROM false);

  IF FOUND THEN
    UPDATE public.orders SET reroute_status = 'failed' WHERE id = p_order_id;
    RAISE EXCEPTION 'Mapping missing or item unavailable for reroute';
  END IF;

  -- Compute subtotal from mapped items
  SELECT SUM(oi.quantity * mi.price) INTO v_subtotal
  FROM public.order_items oi
  JOIN public.backup_mappings bm ON bm.source_item_id = oi.menu_item_id
    AND bm.source_restaurant_id = v_order.restaurant_id
    AND bm.target_restaurant_id = p_backup_restaurant_id
    AND bm.is_active = true
  JOIN public.menu_items mi ON mi.id = bm.target_item_id
  WHERE oi.order_id = p_order_id;

  IF v_subtotal IS NULL OR v_subtotal <= 0 THEN
    UPDATE public.orders SET reroute_status = 'failed' WHERE id = p_order_id;
    RAISE EXCEPTION 'Reroute subtotal invalid';
  END IF;

  v_tax := ROUND(v_subtotal * v_tax_rate, 2);
  v_new_order_id := NULL;

  INSERT INTO public.orders (
    user_id,
    restaurant_id,
    delivery_address_id,
    delivery_address,
    subtotal,
    delivery_fee,
    tax_amount,
    tip_amount,
    total,
    payment_method,
    delivery_instructions,
    receipt_url,
    status,
    payment_status,
    wallet_capture_status,
    rerouted_from_order_id
  )
  VALUES (
    v_order.user_id,
    p_backup_restaurant_id,
    v_order.delivery_address_id,
    v_order.delivery_address,
    v_subtotal,
    v_delivery_fee,
    v_tax,
    v_tip,
    ROUND(v_subtotal + v_delivery_fee + v_tax + v_tip, 2),
    v_order.payment_method,
    v_order.delivery_instructions,
    v_order.receipt_url,
    'pending',
    COALESCE(v_order.payment_status, 'initiated'),
    COALESCE(v_order.wallet_capture_status, 'pending'),
    v_order.id
  )
  RETURNING id INTO v_new_order_id;

  -- Adjust payment state: mark original as voided/released, new as initiated/hold
  UPDATE public.orders
  SET payment_status = 'voided',
      wallet_capture_status = 'released',
      updated_at = now()
  WHERE id = p_order_id;

  UPDATE public.orders
  SET payment_status = 'initiated',
      wallet_capture_status = 'pending',
      updated_at = now()
  WHERE id = v_new_order_id;

  INSERT INTO public.delivery_events(order_id, event_type, payload)
  VALUES (
    p_order_id,
    'payment_adjusted_reroute',
    jsonb_build_object(
      'old_total', v_old_total,
      'new_total', ROUND(v_subtotal + v_delivery_fee + v_tax + v_tip, 2),
      'new_order_id', v_new_order_id
    )
  );

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'payment_adjusted_reroute',
    'orders',
    p_order_id,
    jsonb_build_object(
      'old_total', v_old_total,
      'new_total', ROUND(v_subtotal + v_delivery_fee + v_tax + v_tip, 2),
      'new_order_id', v_new_order_id
    )
  );

  -- Handle delivery reassignment
  SELECT * INTO v_delivery FROM public.deliveries WHERE order_id = p_order_id LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    -- Cancel the old delivery if it is still active
    IF v_delivery.status NOT IN ('delivered','cancelled') THEN
      UPDATE public.deliveries
      SET status = 'cancelled',
          cancellation_reason = 'rerouted',
          cancelled_at = now(),
          updated_at = now()
      WHERE id = v_delivery.id;
    END IF;

    -- Create a new delivery, optionally keeping the same driver
    INSERT INTO public.deliveries (
      order_id,
      driver_id,
      pickup_address,
      delivery_address,
      pickup_latitude,
      pickup_longitude,
      delivery_latitude,
      delivery_longitude,
      distance_km,
      estimated_duration_minutes,
      delivery_fee,
      driver_earnings,
      status,
      assigned_at
    )
    VALUES (
      v_new_order_id,
      v_delivery.driver_id,
      v_backup.address,
      v_delivery.delivery_address,
      v_backup.latitude,
      v_backup.longitude,
      v_delivery.delivery_latitude,
      v_delivery.delivery_longitude,
      v_delivery.distance_km,
      v_delivery.estimated_duration_minutes,
      v_delivery.delivery_fee,
      v_delivery.driver_earnings,
      CASE WHEN v_delivery.driver_id IS NOT NULL THEN 'assigned' ELSE 'pending' END,
      CASE WHEN v_delivery.driver_id IS NOT NULL THEN now() ELSE NULL END
    )
    RETURNING id INTO v_new_delivery_id;

    INSERT INTO public.delivery_events(order_id, driver_id, event_type, payload)
    VALUES (
      p_order_id,
      v_delivery.driver_id,
      'reroute_delivery_reassigned',
      jsonb_build_object('old_delivery_id', v_delivery.id, 'new_delivery_id', v_new_delivery_id, 'driver_id', v_delivery.driver_id)
    );
    INSERT INTO public.audit_logs(action, table_name, record_id, detail)
    VALUES (
      'reroute_delivery_reassigned',
      'deliveries',
      v_delivery.id,
      jsonb_build_object('old_delivery_id', v_delivery.id, 'new_delivery_id', v_new_delivery_id, 'driver_id', v_delivery.driver_id)
    );
  END IF;

  INSERT INTO public.order_items (order_id, menu_item_id, quantity, unit_price, total_price, special_instructions)
  SELECT
    v_new_order_id,
    bm.target_item_id,
    oi.quantity,
    mi.price,
    mi.price * oi.quantity,
    oi.special_instructions
  FROM public.order_items oi
  JOIN public.backup_mappings bm ON bm.source_item_id = oi.menu_item_id
    AND bm.source_restaurant_id = v_order.restaurant_id
    AND bm.target_restaurant_id = p_backup_restaurant_id
    AND bm.is_active = true
  JOIN public.menu_items mi ON mi.id = bm.target_item_id
  WHERE oi.order_id = p_order_id;

  UPDATE public.orders SET reroute_status = 'performed' WHERE id = p_order_id;
  RETURN v_new_order_id;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.orders SET reroute_status = 'failed' WHERE id = p_order_id;
  RAISE;
END;
$$;

-- Secure RPC wrapper with idempotency for reroute
CREATE OR REPLACE FUNCTION public.reroute_order_rpc(
  p_order_id uuid,
  p_backup_restaurant_id uuid,
  p_idempotency_key text,
  p_mapping_override jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing record;
  v_new_order_id uuid;
  v_role text;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to reroute';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key required';
  END IF;

  -- Short-circuit if this idempotent reroute already recorded
  SELECT payload->>'new_order_id' AS new_order_id
  INTO v_existing
  FROM public.delivery_events
  WHERE order_id = p_order_id
    AND event_type = 'auto_reroute_performed'
    AND payload->>'idempotency_key' = p_idempotency_key
  LIMIT 1;

  IF v_existing.new_order_id IS NOT NULL THEN
    RETURN v_existing.new_order_id::uuid;
  END IF;

  -- Optionally allow overrides for mapping (append temporary mappings)
  IF p_mapping_override IS NOT NULL THEN
    INSERT INTO public.backup_mappings (source_restaurant_id, source_item_id, target_restaurant_id, target_item_id, is_active)
    SELECT
      (p_mapping_override->>'source_restaurant_id')::uuid,
      (p_mapping_override->>'source_item_id')::uuid,
      p_backup_restaurant_id,
      (p_mapping_override->>'target_item_id')::uuid,
      true
    ON CONFLICT DO NOTHING;
  END IF;

  v_new_order_id := public.reroute_order_safe(p_order_id, p_backup_restaurant_id);

  INSERT INTO public.delivery_events(order_id, event_type, payload)
  VALUES (
    p_order_id,
    'auto_reroute_performed',
    jsonb_build_object(
      'new_order_id', v_new_order_id,
      'backup_restaurant_id', p_backup_restaurant_id,
      'idempotency_key', p_idempotency_key
    )
  );

  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'auto_reroute_performed',
    'orders',
    p_order_id,
    jsonb_build_object(
      'new_order_id', v_new_order_id,
      'backup_restaurant_id', p_backup_restaurant_id,
      'idempotency_key', p_idempotency_key
    )
  );

  RETURN v_new_order_id;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.delivery_events(order_id, event_type, payload)
  VALUES (
    p_order_id,
    'auto_reroute_failed',
    jsonb_build_object('backup_restaurant_id', p_backup_restaurant_id, 'idempotency_key', p_idempotency_key, 'error', SQLERRM)
  );
  INSERT INTO public.audit_logs(action, table_name, record_id, detail)
  VALUES (
    'auto_reroute_failed',
    'orders',
    p_order_id,
    jsonb_build_object('backup_restaurant_id', p_backup_restaurant_id, 'idempotency_key', p_idempotency_key, 'error', SQLERRM)
  );
  RAISE;
END;
$$;

-- Ensure pg_cron exists for scheduled maintenance
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- Schedule daily metrics populate (3:00 AM) and kill switch (3:05 AM) idempotently
DO $$
DECLARE
  v_job_id int;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'trusted_arrival_metrics_daily';
  IF v_job_id IS NULL THEN
    PERFORM cron.schedule('trusted_arrival_metrics_daily', '0 3 * * *', 'SELECT public.populate_metrics_trusted_arrival();');
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'trusted_arrival_kill_switch';
  IF v_job_id IS NULL THEN
    PERFORM cron.schedule('trusted_arrival_kill_switch', '5 3 * * *', 'SELECT public.apply_trusted_kill_switch();');
  END IF;
END;
$$;

-- Upsert rollout config with environment defaults (overrides previous seed)
INSERT INTO public.trusted_rollout_config(key, config, updated_at)
VALUES ('trusted_arrival', jsonb_build_object(
  'observe_only', true,
  'substitutions_enabled_for', '[]'::jsonb,
  'reroute_enabled_for', '[]'::jsonb,
  'kill_switch_on_time', 85,
  'kill_switch_reroute_rate', 20,
  'kill_switch_credit_budget', 50
), now())
ON CONFLICT (key) DO UPDATE
SET config = EXCLUDED.config,
    updated_at = now();
-- Seed starter SLA + substitutions + backups for testing (safe if empty)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.restaurants ORDER BY created_at LIMIT 5 LOOP
    INSERT INTO public.restaurant_sla (restaurant_id, prep_p50_minutes, prep_p90_minutes, reliability_score, buffer_minutes)
    VALUES (r.id, 12, 20, 0.92, 5)
    ON CONFLICT (restaurant_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Sample substitutions: pick first two items per restaurant when available
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT mi.restaurant_id, mi.id AS item_id, mi2.id AS substitute_item_id
    FROM public.menu_items mi
    JOIN public.menu_items mi2 ON mi2.restaurant_id = mi.restaurant_id AND mi2.id <> mi.id
    WHERE mi.restaurant_id IS NOT NULL
    ORDER BY mi.created_at
    LIMIT 10
  LOOP
    INSERT INTO public.item_substitutions (restaurant_id, item_id, substitute_item_id, rule_type, max_delta_pct, auto_apply, notes)
    VALUES (rec.restaurant_id, rec.item_id, rec.substitute_item_id, 'same-category', 10.00, false, 'Starter substitution rule')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Sample backup relationships: pair restaurants with their next available peer
WITH pairs AS (
  SELECT r1.id AS restaurant_id, r2.id AS backup_restaurant_id,
         row_number() OVER (PARTITION BY r1.id ORDER BY r2.created_at) AS rn
  FROM public.restaurants r1
  JOIN public.restaurants r2 ON r1.id <> r2.id
)
INSERT INTO public.backup_restaurants (restaurant_id, backup_restaurant_id, priority, max_distance_km, cuisine_match, is_active)
SELECT restaurant_id, backup_restaurant_id, rn, 5.00, true, true
FROM pairs
WHERE rn <= 2
ON CONFLICT DO NOTHING;

-- Seed backup mappings for restaurant pairs using name matches (safe/no-op if present)
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT
      br.restaurant_id AS source_restaurant_id,
      br.backup_restaurant_id AS target_restaurant_id,
      mi.id AS source_item_id,
      mi2.id AS target_item_id
    FROM public.backup_restaurants br
    JOIN public.menu_items mi ON mi.restaurant_id = br.restaurant_id
    JOIN public.menu_items mi2 ON mi2.restaurant_id = br.backup_restaurant_id
      AND lower(mi2.name) = lower(mi.name)
  LOOP
    INSERT INTO public.backup_mappings (source_restaurant_id, source_item_id, target_restaurant_id, target_item_id, is_active)
    VALUES (rec.source_restaurant_id, rec.source_item_id, rec.target_restaurant_id, rec.target_item_id, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Metrics + rollout config for trusted arrival
CREATE TABLE IF NOT EXISTS public.metrics_trusted_arrival (
  id bigserial PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  on_time_pct numeric(5,2),
  reroute_rate numeric(5,2),
  substitution_acceptance numeric(5,2),
  credit_cost numeric(12,2),
  affected_orders int,
  csat_affected numeric(3,2),
  csat_baseline numeric(3,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS metrics_trusted_arrival_uniq
  ON public.metrics_trusted_arrival (restaurant_id, metric_date);

CREATE INDEX IF NOT EXISTS metrics_trusted_arrival_date_idx
  ON public.metrics_trusted_arrival (metric_date DESC);

CREATE TABLE IF NOT EXISTS public.trusted_rollout_config (
  key text PRIMARY KEY,
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- View to compute daily aggregates from orders/events (can be materialized upstream)
DROP VIEW IF EXISTS public.metrics_trusted_arrival_view;
CREATE OR REPLACE VIEW public.metrics_trusted_arrival_view AS
WITH base AS (
  SELECT
    o.restaurant_id,
    (o.created_at)::date AS metric_date,
    COUNT(*) FILTER (WHERE o.delivered_at IS NOT NULL) AS delivered_orders,
    COUNT(*) FILTER (
      WHERE o.delivered_at IS NOT NULL
        AND o.eta_confidence_high IS NOT NULL
        AND o.delivered_at <= o.eta_confidence_high
    ) AS on_time_orders,
    COALESCE(SUM(CASE WHEN wt.metadata->>'source' = 'delay_credit' THEN wt.amount ELSE 0 END), 0) AS credit_cost,
    COUNT(*) FILTER (WHERE de.event_type = 'auto_reroute_decision' AND (de.payload->>'decision') = 'approve') AS reroute_approvals,
    COUNT(*) FILTER (WHERE de.event_type = 'auto_reroute_decision') AS reroute_events,
    COUNT(*) FILTER (WHERE de.event_type = 'auto_reroute_performed') AS reroute_success,
    COUNT(*) FILTER (WHERE de.event_type = 'auto_reroute_failed') AS reroute_failed,
    COUNT(*) FILTER (WHERE de.event_type = 'substitution_choice' AND (de.payload->>'decision') = 'accept') AS subs_accept,
    COUNT(*) FILTER (WHERE de.event_type = 'substitution_choice') AS subs_events
  FROM public.orders o
  LEFT JOIN public.delivery_events de ON de.order_id = o.id
  LEFT JOIN public.wallet_transactions wt ON wt.order_id = o.id
  GROUP BY 1,2
)
SELECT
  restaurant_id,
  metric_date,
  CASE WHEN delivered_orders > 0 THEN ROUND(on_time_orders::numeric / delivered_orders * 100, 2) ELSE NULL END AS on_time_pct,
  CASE WHEN reroute_events > 0 THEN ROUND(reroute_approvals::numeric / reroute_events * 100, 2) ELSE NULL END AS reroute_rate,
  CASE WHEN (reroute_success + reroute_failed) > 0 THEN ROUND(reroute_success::numeric / (reroute_success + reroute_failed) * 100, 2) ELSE NULL END AS reroute_success_rate,
  CASE WHEN subs_events > 0 THEN ROUND(subs_accept::numeric / subs_events * 100, 2) ELSE NULL END AS substitution_acceptance,
  credit_cost,
  delivered_orders AS affected_orders,
  NULL::numeric AS csat_affected,
  NULL::numeric AS csat_baseline
FROM base;
