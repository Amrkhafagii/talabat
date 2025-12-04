-- Ensure RLS is enabled and allow both anon (pre-session) and authenticated (post-signup session) to create their own user profile row
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can sign themselves up" ON public.users;
CREATE POLICY "Users can sign themselves up"
  ON public.users
  FOR INSERT
  TO anon
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can create themselves" ON public.users;
CREATE POLICY "Authenticated users can create themselves"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Keep update limited to the owner
DROP POLICY IF EXISTS "Users can update themselves" ON public.users;
CREATE POLICY "Users can update themselves"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
