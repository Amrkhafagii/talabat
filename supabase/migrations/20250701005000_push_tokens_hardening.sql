/*
  # Harden push token storage

  - Add UPDATE policy so users can rotate their own tokens
  - Add uniqueness + index for tokens and lookups
  - Provide a service-role RPC to fetch tokens for arbitrary users (for server-side notifications)
*/

-- Allow users to update their own push tokens (e.g., token rotation)
CREATE POLICY "Users can update their own push tokens"
  ON public.user_push_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure each push token is stored once and speed up lookups
ALTER TABLE public.user_push_tokens
  ADD CONSTRAINT user_push_tokens_token_key UNIQUE (token);

CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_idx
  ON public.user_push_tokens (user_id);

-- Service-role RPC to fetch tokens for multiple users
CREATE OR REPLACE FUNCTION public.get_push_tokens_for_users(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, token text, platform text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT user_id, token, platform
  FROM public.user_push_tokens
  WHERE user_id = ANY(p_user_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_push_tokens_for_users(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_push_tokens_for_users(uuid[]) TO service_role;
