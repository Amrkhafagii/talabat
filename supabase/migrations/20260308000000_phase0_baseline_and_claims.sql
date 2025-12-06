/*
  # Phase 0 – Baseline & Claims

  - Push user_type into JWT claims via auth.users.app_metadata
  - Keep auth.users in sync when public.users.user_type changes
  - Backfill existing users so new tokens include user_type
  - Backfill restaurant ownership when we can derive it
  - Guard new restaurant inserts to auto-attach owner_id when missing
*/

-- Sync user_type from public.users into auth.users.app_metadata for future JWTs
CREATE OR REPLACE FUNCTION public.sync_user_type_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object('user_type', NEW.user_type),
      updated_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_type_to_auth ON public.users;
CREATE TRIGGER trg_sync_user_type_to_auth
AFTER INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_type_to_auth();

-- Backfill existing auth.users with user_type so refreshed tokens carry the claim
UPDATE auth.users au
SET raw_app_meta_data = coalesce(au.raw_app_meta_data, '{}'::jsonb)
                         || jsonb_build_object('user_type', u.user_type),
    updated_at = now()
FROM public.users u
WHERE au.id = u.id
  AND coalesce(au.raw_app_meta_data ->> 'user_type', '') IS DISTINCT FROM u.user_type;

-- Auto-attach owner_id on restaurant inserts when available
CREATE OR REPLACE FUNCTION public.set_restaurant_owner_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_restaurant_owner_id ON public.restaurants;
CREATE TRIGGER trg_set_restaurant_owner_id
BEFORE INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.set_restaurant_owner_id();

-- Backfill restaurant ownership where we can infer it via matching email
UPDATE public.restaurants r
SET owner_id = u.id
FROM public.users u
WHERE r.owner_id IS NULL
  AND u.user_type = 'restaurant'
  AND r.email IS NOT NULL
  AND u.email IS NOT NULL
  AND lower(r.email) = lower(u.email);
