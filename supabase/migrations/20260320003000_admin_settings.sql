/*
  # Admin settings persistence

  - Stores admin preferences (push, email, data sharing) per user
  - Adds RPCs get_admin_settings / set_admin_settings for the mobile app
*/

CREATE TABLE IF NOT EXISTS public.admin_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT true,
  data_sharing boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Policies: allow authenticated users to manage their own settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_settings' AND policyname = 'select_own_admin_settings') THEN
    CREATE POLICY select_own_admin_settings ON public.admin_settings
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_settings' AND policyname = 'upsert_own_admin_settings') THEN
    CREATE POLICY upsert_own_admin_settings ON public.admin_settings
      FOR INSERT WITH CHECK (user_id = auth.uid());
    CREATE POLICY update_own_admin_settings ON public.admin_settings
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END$$;

-- RPC: get current user's admin settings
DROP FUNCTION IF EXISTS public.get_admin_settings();
CREATE OR REPLACE FUNCTION public.get_admin_settings()
RETURNS TABLE(
  push_enabled boolean,
  email_enabled boolean,
  data_sharing boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(s.push_enabled, true) AS push_enabled,
    COALESCE(s.email_enabled, true) AS email_enabled,
    COALESCE(s.data_sharing, true) AS data_sharing
  FROM public.admin_settings s
  WHERE s.user_id = auth.uid()
  UNION ALL
  SELECT true, true, true
  WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings WHERE user_id = auth.uid())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_admin_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_settings() TO authenticated;

-- RPC: set current user's admin settings
DROP FUNCTION IF EXISTS public.set_admin_settings(boolean, boolean, boolean);
CREATE OR REPLACE FUNCTION public.set_admin_settings(
  p_push_enabled boolean,
  p_email_enabled boolean,
  p_data_sharing boolean
)
RETURNS TABLE(
  push_enabled boolean,
  email_enabled boolean,
  data_sharing boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_settings (user_id, push_enabled, email_enabled, data_sharing, updated_at)
  VALUES (auth.uid(), p_push_enabled, p_email_enabled, p_data_sharing, now())
  ON CONFLICT (user_id) DO UPDATE
    SET push_enabled = EXCLUDED.push_enabled,
        email_enabled = EXCLUDED.email_enabled,
        data_sharing = EXCLUDED.data_sharing,
        updated_at = now();

  RETURN QUERY
  SELECT push_enabled, email_enabled, data_sharing
  FROM public.admin_settings
  WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_admin_settings(boolean, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin_settings(boolean, boolean, boolean) TO authenticated;
