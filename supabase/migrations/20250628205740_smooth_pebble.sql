/*
  # Fix Database Schema Errors

  1. New Tables
    - `user_addresses` - User delivery addresses with RLS policies

  2. Missing Columns
    - Add all missing columns to existing tables
    - Update existing data to match new schema
    - Add proper indexes for performance

  3. Security
    - Enable RLS on new tables
    - Add proper policies for user data access

  4. Performance
    - Add indexes on frequently queried columns
    - Add updated_at triggers where missing
*/

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  latitude decimal(10,8),
  longitude decimal(11,8),
  is_default boolean DEFAULT false,
  delivery_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own addresses" ON user_addresses;
CREATE POLICY "Users can view their own addresses"
  ON user_addresses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own addresses" ON user_addresses;
CREATE POLICY "Users can create their own addresses"
  ON user_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own addresses" ON user_addresses;
CREATE POLICY "Users can update their own addresses"
  ON user_addresses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own addresses" ON user_addresses;
CREATE POLICY "Users can delete their own addresses"
  ON user_addresses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add missing columns to categories if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE categories ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE categories ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'description'
  ) THEN
    ALTER TABLE categories ADD COLUMN description text;
  END IF;
END $$;

-- Add missing columns to menu_items if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'is_popular'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN is_popular boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN is_available boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'preparation_time'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN preparation_time integer DEFAULT 15;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'calories'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN calories integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'allergens'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN allergens text[];
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'ingredients'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN ingredients text[];
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'menu_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add missing columns to restaurants if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'is_promoted'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN is_promoted boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'is_open'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN is_open boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'total_reviews'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN total_reviews integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'description'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN description text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'address'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN address text DEFAULT 'Restaurant Address';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'phone'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN phone text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'email'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN email text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'minimum_order'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN minimum_order decimal(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'cover_image'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN cover_image text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurants' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE restaurants ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add missing columns to delivery_drivers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN is_available boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'license_number'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN license_number text DEFAULT 'DL123456789';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'current_latitude'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN current_latitude decimal(10,8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'current_longitude'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN current_longitude decimal(11,8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'last_location_update'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN last_location_update timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'total_earnings'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN total_earnings decimal(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'background_check_status'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN background_check_status text DEFAULT 'approved';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'documents_verified'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN documents_verified boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'vehicle_make'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN vehicle_make text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'vehicle_model'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN vehicle_model text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'vehicle_year'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN vehicle_year integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'vehicle_color'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN vehicle_color text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'license_plate'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN license_plate text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add missing columns to orders if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_address_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_address_id uuid REFERENCES user_addresses(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE orders ADD COLUMN subtotal decimal(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_fee'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_fee decimal(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN tax_amount decimal(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'tip_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN tip_amount decimal(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text DEFAULT 'card';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_instructions'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_instructions text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN confirmed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'prepared_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN prepared_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'picked_up_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN picked_up_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivered_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN cancelled_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE orders ADD COLUMN cancellation_reason text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add missing columns to order_items if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE order_items ADD COLUMN unit_price decimal(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'total_price'
  ) THEN
    ALTER TABLE order_items ADD COLUMN total_price decimal(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'special_instructions'
  ) THEN
    ALTER TABLE order_items ADD COLUMN special_instructions text;
  END IF;
END $$;

-- Add missing columns to deliveries if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'pickup_latitude'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN pickup_latitude decimal(10,8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'pickup_longitude'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN pickup_longitude decimal(11,8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'delivery_latitude'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN delivery_latitude decimal(10,8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'delivery_longitude'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN delivery_longitude decimal(11,8);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'driver_earnings'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN driver_earnings decimal(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN cancellation_reason text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'delivery_notes'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN delivery_notes text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update existing data to match new schema
UPDATE categories SET is_active = true WHERE is_active IS NULL;
UPDATE categories SET sort_order = 0 WHERE sort_order IS NULL;
UPDATE menu_items SET is_popular = popular WHERE is_popular IS NULL AND popular IS NOT NULL;
UPDATE menu_items SET is_available = true WHERE is_available IS NULL;
UPDATE menu_items SET preparation_time = 15 WHERE preparation_time IS NULL;
UPDATE menu_items SET sort_order = 0 WHERE sort_order IS NULL;
UPDATE restaurants SET is_promoted = promoted WHERE is_promoted IS NULL AND promoted IS NOT NULL;
UPDATE restaurants SET is_active = true WHERE is_active IS NULL;
UPDATE restaurants SET is_open = true WHERE is_open IS NULL;
UPDATE restaurants SET total_reviews = 0 WHERE total_reviews IS NULL;
UPDATE restaurants SET minimum_order = 0.00 WHERE minimum_order IS NULL;
UPDATE delivery_drivers SET is_available = true WHERE is_available IS NULL;
UPDATE delivery_drivers SET total_earnings = 0.00 WHERE total_earnings IS NULL;
UPDATE delivery_drivers SET background_check_status = 'approved' WHERE background_check_status IS NULL;
UPDATE delivery_drivers SET documents_verified = true WHERE documents_verified IS NULL;
UPDATE orders SET subtotal = total WHERE subtotal IS NULL;
UPDATE orders SET delivery_fee = 0.00 WHERE delivery_fee IS NULL;
UPDATE orders SET tax_amount = 0.00 WHERE tax_amount IS NULL;
UPDATE orders SET tip_amount = 0.00 WHERE tip_amount IS NULL;
UPDATE orders SET payment_status = 'pending' WHERE payment_status IS NULL;
UPDATE orders SET payment_method = 'card' WHERE payment_method IS NULL;
UPDATE order_items SET unit_price = price WHERE unit_price IS NULL;
UPDATE order_items SET total_price = (price * quantity) WHERE total_price IS NULL;
UPDATE deliveries SET driver_earnings = delivery_fee * 0.8 WHERE driver_earnings IS NULL;

-- Add triggers for updated_at columns (only if they don't exist)
DO $$
BEGIN
  -- user_addresses trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_addresses_updated_at'
  ) THEN
    CREATE TRIGGER update_user_addresses_updated_at 
      BEFORE UPDATE ON user_addresses 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- menu_items trigger (check if it exists first)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_menu_items_updated_at'
  ) THEN
    CREATE TRIGGER update_menu_items_updated_at 
      BEFORE UPDATE ON menu_items 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- restaurants trigger (check if it exists first)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_restaurants_updated_at'
  ) THEN
    CREATE TRIGGER update_restaurants_updated_at 
      BEFORE UPDATE ON restaurants 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- delivery_drivers trigger (check if it exists first)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_delivery_drivers_updated_at'
  ) THEN
    CREATE TRIGGER update_delivery_drivers_updated_at 
      BEFORE UPDATE ON delivery_drivers 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- orders trigger (check if it exists first)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_orders_updated_at 
      BEFORE UPDATE ON orders 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- deliveries trigger (check if it exists first)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_deliveries_updated_at'
  ) THEN
    CREATE TRIGGER update_deliveries_updated_at 
      BEFORE UPDATE ON deliveries 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(is_default);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_popular ON menu_items(is_popular);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_promoted ON restaurants(is_promoted);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_is_available ON delivery_drivers(is_available);
