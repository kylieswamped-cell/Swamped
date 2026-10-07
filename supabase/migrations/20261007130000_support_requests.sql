-- Support requests sent from the in-app Support page. Attachments live in the
-- private "attachments" bucket under "<user id>/support/...".

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in (
    'payments', 'quotes-invoices', 'jobs-customers', 'account', 'bug', 'feature', 'other'
  )),
  subject text not null check (length(trim(subject)) between 1 and 200),
  message text not null check (length(trim(message)) between 1 and 5000),
  attachment_paths text[] not null default '{}' check (cardinality(attachment_paths) <= 5),
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index support_requests_owner_idx on public.support_requests (owner_id);
alter table public.support_requests enable row level security;

create policy "Users create their own support requests" on public.support_requests
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Users read their own support requests" on public.support_requests
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Users mark their own support requests emailed" on public.support_requests
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

revoke update on public.support_requests from authenticated;
grant update (emailed_at) on public.support_requests to authenticated;
