-- Quotes management: archiving, acceptance tracking, recorded deposits, and files.

alter table public.quotes
  add column archived_at timestamptz,
  add column accepted_at timestamptz,
  add column updated_at timestamptz not null default now(),
  -- A deposit recorded by hand (bank transfer, check, cash...) until Stripe payments land.
  add column deposit_received_amount numeric(12, 2) not null default 0 check (deposit_received_amount >= 0),
  add column deposit_received_at timestamptz,
  add column deposit_method text,
  add column deposit_reference text,
  add column deposit_note text;

create index quotes_owner_archived_idx on public.quotes (owner_id, archived_at);
create index quotes_customer_idx on public.quotes (customer_id);

create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();

-- Stamp when a quote is accepted (and clear it if it moves back), so
-- "Approved Quotes (Last 30 days)" and Close % count acceptances.
create or replace function public.quotes_track_acceptance()
returns trigger language plpgsql as $$
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    new.accepted_at = now();
  elsif new.status <> 'accepted' then
    new.accepted_at = null;
  end if;
  return new;
end;
$$;

create trigger quotes_acceptance before insert or update of status on public.quotes
  for each row execute function public.quotes_track_acceptance();

update public.quotes set accepted_at = coalesce(sent_at, created_at) where status = 'accepted';

-- Line items are edited as a set; let owners see updates on the parent quote.
-- (quote_items already has owner-scoped RLS through its quote.)

-- Files on a quote. Public files go to the customer with the quote; internal
-- ones stay private. The file lives in "attachments" under "<owner id>/quotes/...".
create table public.quote_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  internal boolean not null default false,
  path text not null unique,
  name text not null,
  size_bytes bigint,
  content_type text,
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = owner_id::text)
);

create index quote_attachments_quote_idx on public.quote_attachments (quote_id);
alter table public.quote_attachments enable row level security;

create policy "Owners manage their quote attachments" on public.quote_attachments
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = (select auth.uid()))
  );

-- Carry over the single file attached to quotes made during onboarding.
insert into public.quote_attachments (owner_id, quote_id, path, name)
select owner_id, id, attachment_path, regexp_replace(split_part(attachment_path, '/', -1), '^[a-z0-9]+-', '')
from public.quotes
where attachment_path is not null
on conflict (path) do nothing;
