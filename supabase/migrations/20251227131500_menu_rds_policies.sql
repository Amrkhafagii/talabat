-- Allow authenticated users to manage categories (used by restaurant owners)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Categories insert for authenticated" ON categories;
  CREATE POLICY "Categories insert for authenticated"
    ON categories
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
END$$;

-- Allow restaurant owners to insert menu items for their restaurant
DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners can insert menu items" ON menu_items;
  CREATE POLICY "Owners can insert menu items"
    ON menu_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM restaurants r
        WHERE r.id = menu_items.restaurant_id
          AND r.owner_id = auth.uid()
      )
    );
END$$;
