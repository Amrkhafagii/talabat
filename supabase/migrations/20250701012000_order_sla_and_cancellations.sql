/*
  # Order SLA and cancellation handling

  - Add SLA timestamps and reasons
  - Enforce cancellation reason on cancelled orders
  - Add trigger to auto-set confirmed_at/prepared_at/picked_up_at/delivered_at when status transitions
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_notes text;

-- Ensure timestamp columns exist
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS prepared_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_order_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND NEW.confirmed_at IS NULL THEN
    NEW.confirmed_at := now();
  END IF;
  IF NEW.status = 'preparing' AND NEW.prepared_at IS NULL THEN
    NEW.prepared_at := now();
  END IF;
  IF NEW.status = 'picked_up' AND NEW.picked_up_at IS NULL THEN
    NEW.picked_up_at := now();
  END IF;
  IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
  END IF;
  IF NEW.status = 'cancelled' THEN
    IF NEW.cancellation_reason IS NULL THEN
      RAISE EXCEPTION 'Cancellation reason required';
    END IF;
    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_status_timestamps ON public.orders;
CREATE TRIGGER trg_set_order_status_timestamps
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_status_timestamps();
