-- Notification bell: notifications are derived from existing records (quote
-- approvals, payments, overdue invoices); we only store when the user last
-- marked them read.
alter table public.profiles add column notifications_seen_at timestamptz;
grant update (notifications_seen_at) on public.profiles to authenticated;

-- Partner Program enrollment for logged-in users. One application per account;
-- the status is changed by Swamped staff (service role), never by the client.
create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  email text not null check (length(trim(email)) between 3 and 254),
  business_name text check (length(business_name) <= 200),
  partner_type text not null check (partner_type in (
    'contractor', 'content-creator', 'marketing-agency', 'business-consultant',
    'industry-influencer', 'community-owner', 'software-company', 'other'
  )),
  audience text check (length(audience) <= 2000),
  agreed_terms_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.partner_applications enable row level security;

create policy "Users create their own partner application" on public.partner_applications
  for insert to authenticated with check ((select auth.uid()) = owner_id and status = 'pending');
create policy "Users read their own partner application" on public.partner_applications
  for select to authenticated using ((select auth.uid()) = owner_id);

revoke update, delete on public.partner_applications from anon, authenticated;
