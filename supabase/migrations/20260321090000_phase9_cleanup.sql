/*
  # Phase 9 – Expo cleanup

  - Rename `user_push_tokens` to `push_tokens` now that Flutter is the only client.
  - Collapse and tighten RLS policies; service role retains orchestration access.
  - Drop the Expo-only `get_push_tokens_for_users` RPC.
*/

ALTER TABLE IF EXISTS public.user_push_tokens
  RENAME TO push_tokens;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_push_tokens_token_key'
  ) THEN
    ALTER TABLE public.push_tokens
      RENAME CONSTRAINT user_push_tokens_token_key TO push_tokens_token_key;
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'user_push_tokens_user_id_idx'
  ) THEN
    ALTER INDEX user_push_tokens_user_id_idx RENAME TO push_tokens_user_id_idx;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.push_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own push tokens" ON public.push_tokens;
  DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.push_tokens;
  DROP POLICY IF EXISTS "Users can update their own push tokens" ON public.push_tokens;
  DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public.push_tokens;
  DROP POLICY IF EXISTS "Service role can manage push tokens" ON public.push_tokens;
END $$;

CREATE POLICY "Users manage their push tokens"
  ON public.push_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages push tokens"
  ON public.push_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP FUNCTION IF EXISTS public.get_push_tokens_for_users(uuid[]);
