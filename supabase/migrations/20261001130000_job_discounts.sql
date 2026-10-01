-- Job totals card: a discount and a tax that can each be a fixed amount or a percent.

alter table public.jobs
  add column discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  add column discount_type text not null default 'fixed' check (discount_type in ('percent', 'fixed')),
  add column discount_amount numeric(12, 2) not null default 0,
  add column tax_type text not null default 'percent' check (tax_type in ('percent', 'fixed'));

-- tax_rate held a percent only; it now holds either kind, so allow fixed amounts over 100.
alter table public.jobs drop constraint jobs_tax_rate_check;
alter table public.jobs alter column tax_rate type numeric(12, 3);
alter table public.jobs add constraint jobs_tax_rate_check
  check (tax_rate >= 0 and (tax_type = 'fixed' or tax_rate <= 100));
