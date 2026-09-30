-- Customer management: archiving and multiple attachments per customer.

alter table public.customers add column archived_at timestamptz;
create index customers_owner_archived_idx on public.customers (owner_id, archived_at);

-- Files and photos attached to a customer. The file itself lives in the
-- private "attachments" bucket under "<owner id>/customers/...".
create table public.customer_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  path text not null unique,
  name text not null,
  size_bytes bigint,
  content_type text,
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = owner_id::text)
);

create index customer_attachments_customer_idx on public.customer_attachments (customer_id);
alter table public.customer_attachments enable row level security;

create policy "Owners manage their customer attachments" on public.customer_attachments
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.customers c where c.id = customer_id and c.owner_id = (select auth.uid()))
  );

-- Carry over the single file uploaded during onboarding.
insert into public.customer_attachments (owner_id, customer_id, path, name)
select owner_id, id, attachment_path, regexp_replace(split_part(attachment_path, '/', -1), '^[a-z0-9]+-', '')
from public.customers
where attachment_path is not null
on conflict (path) do nothing;
