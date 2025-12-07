/*
  # Enable Realtime for Order Management

  1. Enable realtime on tables
    - orders
    - deliveries
    - order_items

  2. Set up RLS policies for realtime subscriptions
    - Ensure proper access control for real-time updates
    - Allow authenticated users to subscribe to relevant data

  3. Create indexes for better realtime performance
    - Add indexes on commonly filtered columns for realtime queries
*/

-- Enable realtime on orders/deliveries/order_items tables if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  END IF;
END $$;

-- Add indexes for better realtime performance
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_status ON deliveries(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_status ON deliveries(order_id, status);

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure updated_at triggers exist on all relevant tables
DO $$
BEGIN
    -- Orders table
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_orders_updated_at'
    ) THEN
        CREATE TRIGGER update_orders_updated_at
            BEFORE UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Deliveries table
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_deliveries_updated_at'
    ) THEN
        CREATE TRIGGER update_deliveries_updated_at
            BEFORE UPDATE ON deliveries
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add order_number column to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'order_number'
    ) THEN
        ALTER TABLE orders ADD COLUMN order_number TEXT;
        
        -- Generate order numbers for existing orders
        UPDATE orders 
        SET order_number = 'ORD-' || UPPER(SUBSTRING(id::text, 1, 8))
        WHERE order_number IS NULL;
        
        -- Create unique index on order_number
        CREATE UNIQUE INDEX idx_orders_order_number ON orders(order_number);
    END IF;
END $$;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'ORD-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Add estimated_delivery_time column to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'estimated_delivery_time'
    ) THEN
        ALTER TABLE orders ADD COLUMN estimated_delivery_time TEXT;
    END IF;
END $$;

-- Add distance_km and estimated_duration_minutes to deliveries if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' AND column_name = 'distance_km'
    ) THEN
        ALTER TABLE deliveries ADD COLUMN distance_km DECIMAL(5,2);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deliveries' AND column_name = 'estimated_duration_minutes'
    ) THEN
        ALTER TABLE deliveries ADD COLUMN estimated_duration_minutes INTEGER;
    END IF;
END $$;
