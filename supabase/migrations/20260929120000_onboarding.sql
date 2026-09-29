-- Onboarding: business profile (with onboarding progress), customers, quotes.
-- Every table is owner-scoped with row level security.

-- ---------------------------------------------------------------------------
-- Profiles: one row per user. Holds onboarding progress and business settings.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Where the user is in onboarding; resumes here on next login.
  onboarding_step text not null default 'business-details'
    check (onboarding_step in (
      'business-details', 'business-about', 'business-defaults',
      'stripe', 'customer', 'quote', 'complete'
    )),
  onboarding_completed_at timestamptz,

  -- Step 1 · Part 1: business details
  legal_business_name text,
  contact_name text,
  business_email text,
  business_phone text,
  website_url text,
  street_address text,
  city text,
  state text,
  zip_code text,

  -- Step 1 · Part 2: about the business
  industry text,
  years_in_business integer check (years_in_business >= 0),
  employee_range text,
  revenue_range text,

  -- Step 1 · Part 3: quote & invoice defaults
  quote_expiration_days integer not null default 30 check (quote_expiration_days > 0),
  deposit_value numeric(12, 2) not null default 0 check (deposit_value >= 0),
  deposit_type text not null default 'percent' check (deposit_type in ('percent', 'fixed')),
  quote_terms text,
  invoice_due_days integer not null default 14 check (invoice_due_days > 0),
  invoice_terms text,
  tax_rate numeric(6, 3) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),

  -- Step 2: set once Stripe Connect is actually wired up.
  stripe_account_id text,
  stripe_connected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Rows are created by the sign-up trigger below, never by the client, and the
-- Stripe fields are set by the server (service role) only. A column-level
-- revoke can't override a table-level grant, so grant the editable columns.
revoke insert, update on public.profiles from anon, authenticated;
grant update (
  onboarding_step, onboarding_completed_at,
  legal_business_name, contact_name, business_email, business_phone, website_url,
  street_address, city, state, zip_code,
  industry, years_in_business, employee_range, revenue_range,
  quote_expiration_days, deposit_value, deposit_type, quote_terms,
  invoice_due_days, invoice_terms, tax_rate
) on public.profiles to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile for every new sign-up, prefilled from the signup form.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, contact_name, legal_business_name, business_email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'business_name',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users who signed up before this migration.
insert into public.profiles (id, contact_name, legal_business_name, business_email)
select id, raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'business_name', email
from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  email text,
  phone text,
  street_address text,
  notes text,
  attachment_path text,
  created_at timestamptz not null default now()
);

create index customers_owner_idx on public.customers (owner_id);
alter table public.customers enable row level security;

create policy "Owners manage their customers" on public.customers
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------------
-- Quotes and line items
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  quote_number text not null,
  title text,
  quote_date date not null default current_date,
  expires_on date,
  customer_message text,
  terms text,
  internal_notes text,
  attachment_path text,
  discount_value numeric(12, 2) not null default 0,
  discount_type text not null default 'fixed' check (discount_type in ('percent', 'fixed')),
  tax_value numeric(12, 3) not null default 0,
  tax_type text not null default 'percent' check (tax_type in ('percent', 'fixed')),
  deposit_value numeric(12, 2) not null default 0,
  deposit_type text not null default 'percent' check (deposit_type in ('percent', 'fixed')),
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  deposit_amount numeric(12, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, quote_number)
);

create index quotes_owner_idx on public.quotes (owner_id);
alter table public.quotes enable row level security;

create policy "Owners manage their quotes" on public.quotes
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  position integer not null default 0,
  description text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  taxable boolean not null default true
);

create index quote_items_quote_idx on public.quote_items (quote_id);
alter table public.quote_items enable row level security;

create policy "Owners manage their quote items" on public.quote_items
  for all to authenticated
  using (exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Private file storage: each user's files live under "<user id>/..."
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do nothing;

create policy "Users upload their own attachments" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users read their own attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete their own attachments" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
