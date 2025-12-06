/*
  QA seed data for local testing
  - Run manually in a non-production database.
  - Requires inserting auth.users separately; plug real user IDs below before running.
*/

-- Replace these IDs manually before running:
-- customer_id: 00000000-0000-0000-0000-000000000001
-- restaurant_owner_id: 00000000-0000-0000-0000-000000000002
-- driver_user_id: 00000000-0000-0000-0000-000000000003

DO $$
DECLARE
  v_customer uuid := '00000000-0000-0000-0000-000000000001';
  v_restaurant_owner uuid := '00000000-0000-0000-0000-000000000002';
  v_driver uuid := '00000000-0000-0000-0000-000000000003';
  missing_auth text[] := '{}';
BEGIN

  -- Guard: ensure auth.users exist for these IDs
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_customer) THEN
    missing_auth := array_append(missing_auth, v_customer::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_restaurant_owner) THEN
    missing_auth := array_append(missing_auth, v_restaurant_owner::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_driver) THEN
    missing_auth := array_append(missing_auth, v_driver::text);
  END IF;

  IF array_length(missing_auth, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Missing auth.users for IDs: % (create auth accounts first, then rerun seed)', missing_auth;
  END IF;

-- Profiles
  INSERT INTO public.users (id, email, full_name, user_type)
  VALUES
    (v_customer, 'customer@example.com', 'Test Customer', 'customer'),
    (v_restaurant_owner, 'rest@example.com', 'Test Restaurant Owner', 'restaurant'),
    (v_driver, 'driver@example.com', 'Test Driver', 'delivery')
  ON CONFLICT (id) DO NOTHING;

-- Restaurant
  INSERT INTO public.restaurants (name, cuisine, delivery_time, delivery_fee, image, owner_id, is_open)
  VALUES ('QA Bistro', 'Fusion', '30-40', 10, 'https://placehold.co/300x200', v_restaurant_owner, true)
  ON CONFLICT DO NOTHING;

-- Menu item
  INSERT INTO public.menu_items (restaurant_id, name, description, price, image, category, photo_approval_status)
  SELECT r.id, 'QA Burger', 'Tasty test burger', 80, 'https://placehold.co/200', 'Mains', 'approved'
  FROM public.restaurants r WHERE r.owner_id = v_restaurant_owner
  ON CONFLICT DO NOTHING;

-- Driver profile
  INSERT INTO public.delivery_drivers (user_id, name, phone, vehicle_type, is_online, documents_verified, license_document_status)
  VALUES (v_driver, 'QA Driver', '+201000000000', 'car', false, true, 'approved')
  ON CONFLICT DO NOTHING;

-- Wallets
  PERFORM public.ensure_wallet(v_customer, 'customer', 'EGP');
  PERFORM public.ensure_wallet(v_restaurant_owner, 'restaurant', 'EGP');
  PERFORM public.ensure_wallet(v_driver, 'driver', 'EGP');
END $$;
