-- Phase 3: Data & Backend Prep for delivery flows

-- 1) Delivery lifecycle and issue reporting
alter table if exists public.deliveries
  add column if not exists cancellation_reason_code text,
  add column if not exists issue_count integer default 0;

create table if not exists public.delivery_issues (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references public.deliveries(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  driver_id uuid references public.delivery_drivers(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  reason_code text not null,
  details text,
  status text default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz default now(),
  resolved_at timestamptz,
  metadata jsonb
);

create index if not exists delivery_issues_delivery_idx on public.delivery_issues(delivery_id);
create index if not exists delivery_issues_driver_idx on public.delivery_issues(driver_id);

-- 2) Cash reconciliation entities
create table if not exists public.driver_cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.delivery_drivers(id) on delete cascade,
  cash_on_hand numeric(12,2) not null default 0,
  pending_reconciliation numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','settled','discrepancy')),
  note text,
  created_at timestamptz default now(),
  settled_at timestamptz
);

create table if not exists public.driver_cash_transactions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.delivery_drivers(id) on delete cascade,
  reconciliation_id uuid references public.driver_cash_reconciliations(id) on delete set null,
  amount numeric(12,2) not null,
  currency text default 'EGP',
  type text not null check (type in ('collection','payout','adjustment')),
  reference text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists public.driver_cash_discrepancies (
  id uuid primary key default gen_random_uuid(),
  reconciliation_id uuid references public.driver_cash_reconciliations(id) on delete cascade,
  driver_id uuid references public.delivery_drivers(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text,
  status text default 'open' check (status in ('open','resolved')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists driver_cash_reconciliations_driver_idx on public.driver_cash_reconciliations(driver_id);
create index if not exists driver_cash_transactions_driver_idx on public.driver_cash_transactions(driver_id);
create index if not exists driver_cash_discrepancies_driver_idx on public.driver_cash_discrepancies(driver_id);

create or replace function public.settle_driver_cash(p_driver_id uuid, p_amount numeric)
returns boolean
language plpgsql
security definer
as $$
declare
  rec_id uuid;
begin
  insert into public.driver_cash_reconciliations (driver_id, cash_on_hand, pending_reconciliation, status)
  values (p_driver_id, p_amount, p_amount, 'pending')
  returning id into rec_id;

  insert into public.driver_cash_transactions (driver_id, reconciliation_id, amount, type, reference)
  values (p_driver_id, rec_id, p_amount, 'collection', 'auto-settle');

  update public.driver_cash_reconciliations
    set status = 'settled', settled_at = now(), pending_reconciliation = 0
  where id = rec_id;

  return true;
end;
$$;

-- 3) Payout confirmations and attempts
alter table if exists public.payout_requests
  add column if not exists confirmation_number text,
  add column if not exists eta_text text,
  add column if not exists method_snapshot jsonb;

create table if not exists public.payout_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.payout_requests(id) on delete cascade,
  status text not null check (status in ('pending','processing','succeeded','failed')),
  confirmation_number text,
  eta_text text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payout_attempts' and column_name = 'request_id'
  ) then
    alter table public.payout_attempts
      add column request_id uuid references public.payout_requests(id) on delete cascade;
  end if;
end $$;

create index if not exists payout_attempts_request_idx on public.payout_attempts(request_id);

-- 4) Rating / feedback per order/delivery
create table if not exists public.delivery_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete cascade,
  driver_id uuid references public.delivery_drivers(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  rating integer check (rating between 1 and 5),
  tags text[],
  comment text,
  created_at timestamptz default now()
);

create index if not exists delivery_feedback_delivery_idx on public.delivery_feedback(delivery_id);
create index if not exists delivery_feedback_driver_idx on public.delivery_feedback(driver_id);

-- 5) Seed/dev fixtures for previewing the new flows
insert into public.delivery_issues (delivery_id, order_id, driver_id, reason_code, details, status)
select id, order_id, driver_id, 'incorrect_address', 'Customer location mismatch', 'open'
from public.deliveries
where status = 'assigned'
limit 1
on conflict do nothing;

insert into public.driver_cash_reconciliations (driver_id, cash_on_hand, pending_reconciliation, status)
select driver_id, 158.50, 85.00, 'pending'
from public.deliveries
where driver_id is not null
limit 1
on conflict do nothing;

insert into public.payout_requests (wallet_id, amount, status, confirmation_number, eta_text, method_snapshot)
select w.id, 150.75, 'pending', 'A4B8-C2D6-E9F1-G7H3', 'Arriving in 1-3 business days', jsonb_build_object('method', 'checking', 'last4', '1234')
from public.wallets w
where w.type = 'driver'
limit 1
on conflict do nothing;

insert into public.delivery_feedback (order_id, delivery_id, driver_id, user_id, rating, tags, comment)
select o.id, d.id, d.driver_id, null::uuid, 5, array['friendly_customer','easy_pickup'], 'Great delivery!'
from public.deliveries d
join public.orders o on o.id = d.order_id
limit 1
on conflict do nothing;
