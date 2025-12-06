-- Add restaurant scoping to categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id);

CREATE INDEX IF NOT EXISTS categories_restaurant_id_idx ON categories(restaurant_id);

-- Policies: allow owners to manage their categories, and allow public/global categories when restaurant_id IS NULL
DO $$
BEGIN
  DROP POLICY IF EXISTS "Categories view scoped" ON categories;
  CREATE POLICY "Categories view scoped"
    ON categories
    FOR SELECT
    TO authenticated
    USING (
      restaurant_id IS NULL
      OR EXISTS (
        SELECT 1 FROM restaurants r
        WHERE r.id = categories.restaurant_id
          AND r.owner_id = auth.uid()
      )
    );

  DROP POLICY IF EXISTS "Categories insert scoped" ON categories;
  CREATE POLICY "Categories insert scoped"
    ON categories
    FOR INSERT
    TO authenticated
    WITH CHECK (
      restaurant_id IS NULL
      OR EXISTS (
        SELECT 1 FROM restaurants r
        WHERE r.id = categories.restaurant_id
          AND r.owner_id = auth.uid()
      )
    );
END$$;
