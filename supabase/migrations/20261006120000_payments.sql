-- Payments: numbers and receipt tracking for recorded payments (invoice payments
-- and quote deposits), plus refunds recorded by hand. Stripe payments come later.

alter table public.invoice_payments
  add column payment_number integer,
  add column receipt_sent_at timestamptz,
  add column updated_at timestamptz not null default now();

alter table public.quotes
  add column deposit_payment_number integer,
  add column deposit_receipt_sent_at timestamptz;

create trigger invoice_payments_touch before update on public.invoice_payments
  for each row execute function public.touch_updated_at();

-- Invoice payments and deposits share one PAY-#### sequence per owner, from 1001.
with all_payments as (
  select 'p' as kind, id, owner_id, created_at as at from public.invoice_payments
  union all
  select 'q', id, owner_id, deposit_received_at from public.quotes where deposit_received_amount > 0
), numbered as (
  select kind, id, 1000 + row_number() over (partition by owner_id order by at, id) as num from all_payments
)
update public.invoice_payments p set payment_number = n.num from numbered n where n.kind = 'p' and n.id = p.id;

with all_payments as (
  select 'p' as kind, id, owner_id, created_at as at from public.invoice_payments
  union all
  select 'q', id, owner_id, deposit_received_at from public.quotes where deposit_received_amount > 0
), numbered as (
  select kind, id, 1000 + row_number() over (partition by owner_id order by at, id) as num from all_payments
)
update public.quotes q set deposit_payment_number = n.num from numbered n where n.kind = 'q' and n.id = q.id;

create or replace function public.next_payment_number(owner uuid)
returns integer language sql stable as $$
  select greatest(
    1000,
    coalesce((select max(payment_number) from public.invoice_payments where owner_id = owner), 0),
    coalesce((select max(deposit_payment_number) from public.quotes where owner_id = owner), 0)
  ) + 1;
$$;

create or replace function public.invoice_payments_number()
returns trigger language plpgsql as $$
begin
  new.payment_number = coalesce(new.payment_number, public.next_payment_number(new.owner_id));
  return new;
end;
$$;

create trigger invoice_payments_number before insert on public.invoice_payments
  for each row execute function public.invoice_payments_number();

-- A deposit gets its number when first recorded and loses it when cleared.
create or replace function public.quotes_deposit_number()
returns trigger language plpgsql as $$
begin
  if new.deposit_received_amount > 0 then
    new.deposit_payment_number = coalesce(new.deposit_payment_number, public.next_payment_number(new.owner_id));
  else
    new.deposit_payment_number = null;
    new.deposit_receipt_sent_at = null;
  end if;
  return new;
end;
$$;

create trigger quotes_deposit_number before insert or update of deposit_received_amount on public.quotes
  for each row execute function public.quotes_deposit_number();

-- Money returned to a customer outside Swamped, against one invoice payment or one quote deposit.
create table public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  refund_number integer,
  payment_id uuid references public.invoice_payments (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  refunded_on date not null,
  method text not null,
  reference text,
  note text,
  receipt_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(payment_id, quote_id) = 1)
);

create index payment_refunds_owner_idx on public.payment_refunds (owner_id);
create index payment_refunds_payment_idx on public.payment_refunds (payment_id);
create index payment_refunds_quote_idx on public.payment_refunds (quote_id);
alter table public.payment_refunds enable row level security;

create policy "Owners manage their payment refunds" on public.payment_refunds
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and (payment_id is null or exists (select 1 from public.invoice_payments p where p.id = payment_id and p.owner_id = (select auth.uid())))
    and (quote_id is null or exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = (select auth.uid())))
  );

create trigger payment_refunds_touch before update on public.payment_refunds
  for each row execute function public.touch_updated_at();

create or replace function public.payment_refunds_number()
returns trigger language plpgsql as $$
begin
  new.refund_number = coalesce(
    new.refund_number,
    greatest(1000, coalesce((select max(refund_number) from public.payment_refunds where owner_id = new.owner_id), 0)) + 1
  );
  return new;
end;
$$;

create trigger payment_refunds_number before insert on public.payment_refunds
  for each row execute function public.payment_refunds_number();

-- An invoice's amount_paid is now what was paid less what was refunded.
create or replace function public.invoice_amount_paid(target uuid)
returns numeric language sql stable as $$
  select (select coalesce(sum(amount), 0) from public.invoice_payments where invoice_id = target)
       - (select coalesce(sum(r.amount), 0) from public.payment_refunds r join public.invoice_payments p on p.id = r.payment_id where p.invoice_id = target);
$$;

create or replace function public.invoice_payments_changed()
returns trigger language plpgsql as $$
declare
  target uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices set amount_paid = public.invoice_amount_paid(target) where id = target;
  if tg_op = 'UPDATE' and old.invoice_id <> new.invoice_id then
    update public.invoices set amount_paid = public.invoice_amount_paid(old.invoice_id) where id = old.invoice_id;
  end if;
  return null;
end;
$$;

create or replace function public.payment_refunds_changed()
returns trigger language plpgsql as $$
declare
  target uuid;
begin
  -- A refund removed along with its payment finds no invoice; the payment's own trigger settles it.
  select invoice_id into target from public.invoice_payments where id = coalesce(new.payment_id, old.payment_id);
  if target is not null then
    update public.invoices set amount_paid = public.invoice_amount_paid(target) where id = target;
  end if;
  return null;
end;
$$;

create trigger payment_refunds_sync after insert or update or delete on public.payment_refunds
  for each row execute function public.payment_refunds_changed();
