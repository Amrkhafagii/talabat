-- Allow authenticated users to insert/select their own restaurant rows
DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners can insert their restaurant" ON restaurants;
  CREATE POLICY "Owners can insert their restaurant"
    ON restaurants
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

  DROP POLICY IF EXISTS "Owners can view their restaurant" ON restaurants;
  CREATE POLICY "Owners can view their restaurant"
    ON restaurants
    FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());
END$$;
