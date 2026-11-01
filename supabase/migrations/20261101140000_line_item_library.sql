-- Saved line items users can reuse on future quotes, jobs, and invoices.
-- `description` follows the line item convention: name on the first line,
-- optional details after it.

create table public.line_item_library (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 2000),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  taxable boolean not null default true,
  created_at timestamptz not null default now()
);

create index line_item_library_owner_idx on public.line_item_library (owner_id, created_at desc);
alter table public.line_item_library enable row level security;

create policy "Owners manage their saved line items" on public.line_item_library
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
