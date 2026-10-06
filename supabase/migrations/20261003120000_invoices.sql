-- Invoices: billing a customer, optionally for a job or quote, with line items,
-- files, and payments recorded by hand (Stripe payments come later).

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  -- What the invoice bills for, if anything. Invoices outlive these links.
  job_id uuid references public.jobs (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  invoice_number text not null,
  title text,
  invoice_date date not null default current_date,
  -- "Net N days" from the invoice date; due_on is what the app compares against.
  due_days integer not null default 14 check (due_days >= 0),
  due_on date not null,
  customer_message text,
  terms text,
  internal_notes text,
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  discount_type text not null default 'fixed' check (discount_type in ('percent', 'fixed')),
  tax_value numeric(12, 3) not null default 0 check (tax_value >= 0),
  tax_type text not null default 'percent' check (tax_type in ('percent', 'fixed')),
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  -- A deposit already paid on the linked quote, credited against the total.
  deposit_credit numeric(12, 2) not null default 0 check (deposit_credit >= 0),
  -- Sum of invoice_payments, kept in step by trigger.
  amount_paid numeric(12, 2) not null default 0,
  -- Draft until sent; Void when cancelled. Paid / Partially Paid / Overdue follow from the amounts and due date.
  status text not null default 'draft' check (status in ('draft', 'sent', 'void')),
  sent_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, invoice_number),
  check (due_on >= invoice_date)
);

create index invoices_owner_idx on public.invoices (owner_id, archived_at);
create index invoices_customer_idx on public.invoices (customer_id);
create index invoices_job_idx on public.invoices (job_id);
create index invoices_quote_idx on public.invoices (quote_id);
alter table public.invoices enable row level security;

-- The customer, job, and quote must belong to the same owner as the invoice.
create policy "Owners manage their invoices" on public.invoices
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.customers c where c.id = customer_id and c.owner_id = (select auth.uid()))
    and (job_id is null or exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = (select auth.uid())))
    and (quote_id is null or exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = (select auth.uid())))
  );

create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  position integer not null default 0,
  description text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  taxable boolean not null default true
);

create index invoice_items_invoice_idx on public.invoice_items (invoice_id);
alter table public.invoice_items enable row level security;

create policy "Owners manage their invoice items" on public.invoice_items
  for all to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and i.owner_id = (select auth.uid())));

-- Files on an invoice. Public files go to the customer with the invoice; internal
-- ones stay private. The file lives in "attachments" under "<owner id>/invoices/...".
create table public.invoice_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  internal boolean not null default false,
  path text not null unique,
  name text not null,
  size_bytes bigint,
  content_type text,
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = owner_id::text)
);

create index invoice_attachments_invoice_idx on public.invoice_attachments (invoice_id);
alter table public.invoice_attachments enable row level security;

create policy "Owners manage their invoice attachments" on public.invoice_attachments
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.owner_id = (select auth.uid()))
  );

-- Payments received outside Swamped (bank transfer, check, cash...).
create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null,
  method text not null,
  reference text,
  note text,
  created_at timestamptz not null default now()
);

create index invoice_payments_invoice_idx on public.invoice_payments (invoice_id);
alter table public.invoice_payments enable row level security;

create policy "Owners manage their invoice payments" on public.invoice_payments
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.owner_id = (select auth.uid()))
  );

-- Keep amount_paid in step with the payments (paid_at follows below).
create or replace function public.invoice_payments_changed()
returns trigger language plpgsql as $$
declare
  target uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices
     set amount_paid = (select coalesce(sum(amount), 0) from public.invoice_payments where invoice_id = target)
   where id = target;
  return null;
end;
$$;

create trigger invoice_payments_sync after insert or update or delete on public.invoice_payments
  for each row execute function public.invoice_payments_changed();

-- A changed total can settle (or reopen) an invoice too.
create or replace function public.invoices_track_paid()
returns trigger language plpgsql as $$
begin
  if new.total - new.deposit_credit - new.amount_paid <= 0 and new.total > 0 then
    new.paid_at = coalesce(new.paid_at, now());
  else
    new.paid_at = null;
  end if;
  return new;
end;
$$;

create trigger invoices_paid before insert or update of total, deposit_credit, amount_paid on public.invoices
  for each row execute function public.invoices_track_paid();
