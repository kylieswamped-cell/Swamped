-- Jobs: scheduled work for a customer, with line items and attachments.

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  -- The quote this job came from, if any. Quotes outlive the job link.
  quote_id uuid references public.quotes (id) on delete set null,
  job_number text not null,
  title text not null check (length(trim(title)) > 0),
  status text not null default 'unscheduled'
    check (status in ('unscheduled', 'scheduled', 'in_progress', 'completed')),
  starts_at timestamptz,
  ends_at timestamptz,
  -- Customer-facing notes and terms; internal notes stay private.
  notes text,
  terms text,
  internal_notes text,
  tax_rate numeric(6, 3) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  subtotal numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  -- Set by "Save & Send"; a job never sent is a draft.
  sent_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, job_number),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index jobs_owner_idx on public.jobs (owner_id, archived_at);
create index jobs_customer_idx on public.jobs (customer_id);
alter table public.jobs enable row level security;

-- The customer and quote must belong to the same owner as the job.
create policy "Owners manage their jobs" on public.jobs
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.customers c where c.id = customer_id and c.owner_id = (select auth.uid()))
    and (quote_id is null or exists (select 1 from public.quotes q where q.id = quote_id and q.owner_id = (select auth.uid())))
  );

create trigger jobs_touch before update on public.jobs
  for each row execute function public.touch_updated_at();

-- Stamp when a job is completed (and clear it if it's reopened), so
-- "Completed Jobs (Last 30 Days)" counts completions, not creations.
create or replace function public.jobs_track_completion()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at = now();
  elsif new.status <> 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger jobs_completion before insert or update of status on public.jobs
  for each row execute function public.jobs_track_completion();

create table public.job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  position integer not null default 0,
  description text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  taxable boolean not null default true
);

create index job_items_job_idx on public.job_items (job_id);
alter table public.job_items enable row level security;

create policy "Owners manage their job items" on public.job_items
  for all to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = (select auth.uid())));

-- Files on a job. Public files are shared with the customer; internal ones
-- stay private. The file lives in "attachments" under "<owner id>/jobs/...".
create table public.job_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  internal boolean not null default false,
  path text not null unique,
  name text not null,
  size_bytes bigint,
  content_type text,
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = owner_id::text)
);

create index job_attachments_job_idx on public.job_attachments (job_id);
alter table public.job_attachments enable row level security;

create policy "Owners manage their job attachments" on public.job_attachments
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.jobs j where j.id = job_id and j.owner_id = (select auth.uid()))
  );
