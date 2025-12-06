/*
  # Admin payout tools

  - Expose wallet transactions by user/type for console visibility
*/

DROP FUNCTION IF EXISTS public.list_wallet_transactions_for_user(uuid, text, integer);
CREATE OR REPLACE FUNCTION public.list_wallet_transactions_for_user(
  p_user_id uuid,
  p_wallet_type text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  wallet_id uuid,
  wallet_type text,
  amount numeric,
  type text,
  status text,
  reference text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.id AS wallet_id,
    w.type AS wallet_type,
    wt.amount,
    wt.type,
    wt.status,
    wt.reference,
    wt.created_at
  FROM public.wallets w
  JOIN public.wallet_transactions wt ON wt.wallet_id = w.id
  WHERE w.user_id = p_user_id
    AND (p_wallet_type IS NULL OR w.type = p_wallet_type)
  ORDER BY wt.created_at DESC
  LIMIT COALESCE(p_limit, 50);
$$;

REVOKE ALL ON FUNCTION public.list_wallet_transactions_for_user(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_wallet_transactions_for_user(uuid, text, integer) TO authenticated;
