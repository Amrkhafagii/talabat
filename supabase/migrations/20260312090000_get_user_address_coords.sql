/*
  # RPC: get user address coordinates (RLS-safe)

  Allows authenticated clients (restaurant/driver contexts) to fetch latitude/longitude
  for a given user address even when RLS would block direct table access.
*/

CREATE OR REPLACE FUNCTION public.get_user_address_coords(
  p_address_id uuid
)
RETURNS TABLE (
  latitude decimal(10,8),
  longitude decimal(11,8)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT latitude, longitude
  FROM public.user_addresses
  WHERE id = p_address_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_address_coords(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_address_coords(uuid) TO authenticated;
