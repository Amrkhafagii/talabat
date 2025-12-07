-- Update delivery status RPC to support cancellation reason code and audit order updates
create or replace function public.update_delivery_status_safe(
  p_delivery_id uuid,
  p_status text,
  p_temp_check_passed boolean default null,
  p_temp_check_photo_url text default null,
  p_handoff_confirmed boolean default null,
  p_cancellation_reason_code text default null
)
returns void
language plpgsql
as $$
declare
  v_order_id uuid;
  v_driver_id uuid;
begin
  select order_id, driver_id into v_order_id, v_driver_id from public.deliveries where id = p_delivery_id;
  if v_order_id is null then
    raise exception 'Delivery not found';
  end if;

  if p_status = 'picked_up' and (p_temp_check_passed is distinct from true) then
    raise exception 'Temp check required before pickup';
  end if;

  if p_status = 'delivered' and (p_handoff_confirmed is distinct from true) then
    raise exception 'Handoff confirmation required before delivered';
  end if;

  update public.deliveries
    set status = p_status,
        picked_up_at = case when p_status in ('picked_up','on_the_way') then coalesce(picked_up_at, now()) else picked_up_at end,
        delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
        cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
        cancellation_reason_code = coalesce(p_cancellation_reason_code, cancellation_reason_code),
        updated_at = now()
    where id = p_delivery_id;

  if p_status = 'picked_up' then
    insert into public.delivery_events(order_id, driver_id, event_type, payload)
    values (v_order_id, v_driver_id, 'temp_check', jsonb_build_object('passed', p_temp_check_passed, 'photo_url', p_temp_check_photo_url));
  elsif p_status = 'delivered' then
    insert into public.delivery_events(order_id, driver_id, event_type, payload)
    values (v_order_id, v_driver_id, 'handoff_confirmation', jsonb_build_object('confirmed', p_handoff_confirmed));
  elsif p_status = 'cancelled' then
    update public.orders
      set status = 'cancelled',
          cancellation_reason = coalesce(p_cancellation_reason_code, cancellation_reason),
          cancelled_at = coalesce(cancelled_at, now()),
          updated_at = now()
      where id = v_order_id;
    insert into public.delivery_events(order_id, driver_id, event_type, payload)
    values (v_order_id, v_driver_id, 'cancelled', jsonb_build_object('reason_code', p_cancellation_reason_code));
  end if;

  insert into public.audit_logs(action, table_name, record_id, detail)
  values ('update_delivery_status_safe', 'deliveries', p_delivery_id, jsonb_build_object(
    'status', p_status,
    'order_id', v_order_id,
    'temp_check_passed', p_temp_check_passed,
    'handoff_confirmed', p_handoff_confirmed,
    'cancellation_reason_code', p_cancellation_reason_code
  ));
end;
$$;
