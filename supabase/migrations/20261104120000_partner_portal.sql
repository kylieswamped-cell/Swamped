-- Partner portal: referral codes, referral attribution, partner-editable
-- profile fields, and partner support categories.

-- 1. Every partner gets a referral code: their first name plus a short random
--    suffix, e.g. "alex-3f9c2". Swamped staff can change it later.
alter table public.partner_applications
  add column referral_code text unique check (referral_code ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
  add column phone text check (length(phone) <= 40),
  add column website text check (length(website) <= 300),
  add column notify_signups boolean not null default true,
  add column notify_payouts boolean not null default true,
  add column updated_at timestamptz not null default now();

create or replace function public.partner_code_base(p_name text)
returns text language sql immutable set search_path = '' as $$
  select case when length(b) >= 3 then b else 'partner' end
  from (select left(regexp_replace(lower(split_part(trim(coalesce(p_name, '')), ' ', 1)), '[^a-z0-9]', '', 'g'), 16) as b) s;
$$;

create or replace function public.partner_referral_code()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.referral_code is null then
    loop
      new.referral_code := public.partner_code_base(new.full_name) || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
      exit when not exists (select 1 from public.partner_applications where referral_code = new.referral_code);
    end loop;
  end if;
  return new;
end;
$$;

create trigger partner_applications_code before insert on public.partner_applications
  for each row execute function public.partner_referral_code();

-- Existing applications get a code too.
update public.partner_applications
  set referral_code = public.partner_code_base(full_name) || '-' || substr(md5(id::text), 1, 5)
  where referral_code is null;

alter table public.partner_applications alter column referral_code set not null;

create trigger partner_applications_touch before update on public.partner_applications
  for each row execute function public.touch_updated_at();

-- 2. Partners edit their own contact details and notification choices. Status,
--    type, and referral code stay with Swamped staff (service role).
create policy "Partners update their own details" on public.partner_applications
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
grant update (full_name, email, business_name, audience, phone, website, notify_signups, notify_payouts)
  on public.partner_applications to authenticated;

-- 3. Referral attribution. A new account remembers which approved partner's
--    link brought it in. Set only at sign-up (never by the client), so it
--    can't be changed or claimed later.
alter table public.profiles
  add column referred_by uuid references public.partner_applications (id) on delete set null,
  add column referred_at timestamptz;

create index profiles_referred_by_idx on public.profiles (referred_by) where referred_by is not null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_partner uuid;
begin
  select a.id into v_partner
  from public.partner_applications a
  where a.referral_code = lower(trim(new.raw_user_meta_data ->> 'referral_code'))
    and a.status = 'approved'
    and a.owner_id <> new.id;

  insert into public.profiles (id, contact_name, legal_business_name, business_email, referred_by, referred_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'business_name',
    new.email,
    v_partner,
    case when v_partner is not null then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. A partner's referrals: who signed up with their link and whether they
--    finished setting up their account ("activated").
create or replace function public.get_partner_referrals()
returns table (business_name text, signed_up_at timestamptz, activated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(nullif(trim(p.legal_business_name), ''), 'New contractor'),
    p.referred_at,
    p.onboarding_completed_at
  from public.profiles p
  join public.partner_applications a on a.id = p.referred_by
  where a.owner_id = (select auth.uid())
  order by p.referred_at desc
  limit 2000;
$$;

revoke execute on function public.get_partner_referrals() from public, anon;
grant execute on function public.get_partner_referrals() to authenticated;

-- 5. Partner Help Center tickets use the existing support requests.
alter table public.support_requests drop constraint support_requests_category_check;
alter table public.support_requests add constraint support_requests_category_check check (category in (
  'payments', 'quotes-invoices', 'jobs-customers', 'account', 'bug', 'feature', 'other',
  'partner-commissions', 'partner-payouts', 'partner-referrals', 'partner-account', 'partner-resources', 'partner-other'
));
