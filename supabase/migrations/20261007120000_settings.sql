-- Settings: personal details, business profile display options, operating
-- hours, saved tax rates, reminder automation, email templates, notification
-- and communication preferences, and payout preferences. All live on profiles.

alter table public.profiles
  -- Personal information (the account owner, not the business).
  add column first_name text,
  add column last_name text,
  add column personal_phone text,
  add column avatar_path text,

  -- Business profile: logo and what shows on quotes & invoices.
  add column logo_path text,
  add column show_contact_on_docs boolean not null default true,
  add column show_website_on_docs boolean not null default true,
  add column show_address_on_docs boolean not null default true,

  -- Operating hours: { "mon": { "open": true, "from": "09:00", "to": "17:00" }, ... }
  add column time_zone text not null default 'America/New_York',
  add column operating_hours jsonb not null default '{
    "mon": {"open": true, "from": "09:00", "to": "17:00"},
    "tue": {"open": true, "from": "09:00", "to": "17:00"},
    "wed": {"open": true, "from": "09:00", "to": "17:00"},
    "thu": {"open": true, "from": "09:00", "to": "17:00"},
    "fri": {"open": true, "from": "09:00", "to": "17:00"},
    "sat": {"open": false, "from": "09:00", "to": "17:00"},
    "sun": {"open": false, "from": "09:00", "to": "17:00"}
  }'::jsonb,
  add column show_hours_on_docs boolean not null default true,

  -- Saved tax rates offered alongside the default rate (tax_rate).
  add column tax_rates numeric(6, 3)[] not null default '{}',

  -- Reminder automation.
  add column quote_reminder_enabled boolean not null default true,
  add column quote_reminder_days integer not null default 3 check (quote_reminder_days between 1 and 30),
  add column invoice_reminder_enabled boolean not null default true,
  add column invoice_reminder_days integer not null default 3 check (invoice_reminder_days between 1 and 30),
  add column past_due_notice_enabled boolean not null default true,
  add column past_due_reminder_enabled boolean not null default true,
  add column past_due_reminder_days integer not null default 7 check (past_due_reminder_days between 1 and 90),

  -- Customer email templates keyed by template id: { "quote": { "subject": "...", "body": "..." } }.
  -- Missing keys fall back to the built-in defaults.
  add column email_templates jsonb not null default '{}'::jsonb,

  -- Email alerts to the owner and marketing preferences: { "<key>": false } to opt out.
  add column notification_prefs jsonb not null default '{}'::jsonb,
  add column communication_prefs jsonb not null default '{}'::jsonb,

  -- Payout preferences (applied once Stripe Connect is live).
  add column payout_schedule text not null default 'weekly'
    check (payout_schedule in ('daily', 'weekly', 'monthly', 'manual')),
  add column payout_minimum numeric(12, 2) not null default 0 check (payout_minimum >= 0);

grant update (
  first_name, last_name, personal_phone, avatar_path,
  logo_path, show_contact_on_docs, show_website_on_docs, show_address_on_docs,
  time_zone, operating_hours, show_hours_on_docs,
  tax_rates,
  quote_reminder_enabled, quote_reminder_days,
  invoice_reminder_enabled, invoice_reminder_days,
  past_due_notice_enabled, past_due_reminder_enabled, past_due_reminder_days,
  email_templates, notification_prefs, communication_prefs,
  payout_schedule, payout_minimum
) on public.profiles to authenticated;

-- Prefill first/last name from the contact name collected at sign-up.
update public.profiles
set first_name = split_part(trim(contact_name), ' ', 1),
    last_name = nullif(trim(substr(trim(contact_name), length(split_part(trim(contact_name), ' ', 1)) + 1)), '')
where first_name is null and contact_name is not null and trim(contact_name) <> '';
