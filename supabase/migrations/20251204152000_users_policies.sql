-- Allow anonymous signup to create their own user profile rows and keep everything else protected
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can sign themselves up" ON public.users;
CREATE POLICY "Users can sign themselves up"
  ON public.users
  FOR INSERT
  TO anon
  WITH CHECK (auth.uid() = id);

-- Permit authenticated users to update only their own profile row
DROP POLICY IF EXISTS "Users can update themselves" ON public.users;
CREATE POLICY "Users can update themselves"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
