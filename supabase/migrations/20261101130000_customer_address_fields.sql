-- Customer addresses get separate City, State and ZIP fields (filled in by
-- Google address autocomplete when it's configured). full_address joins them
-- into one line for everywhere an address is displayed.

alter table public.customers
  add column city text check (length(city) <= 100),
  add column state text check (length(state) <= 100),
  add column zip_code text check (length(zip_code) <= 20),
  add column full_address text generated always as (
    nullif(trim(both ', ' from
      coalesce(street_address, '')
      || case when coalesce(city, '') <> '' then ', ' || city else '' end
      || case when coalesce(state, '') <> '' or coalesce(zip_code, '') <> ''
           then ', ' || trim(coalesce(state, '') || ' ' || coalesce(zip_code, '')) else '' end
    ), '')
  ) stored;

-- The customer-facing quote and invoice pages show the full address. These are
-- unchanged apart from reading full_address instead of street_address.
create or replace function public.get_public_quote(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case
    when q.status = 'sent' and q.expires_on is not null and q.expires_on < current_date then
      jsonb_build_object(
        'number', q.quote_number,
        'expired', true,
        'expiresOn', q.expires_on,
        'business', b.business
      )
    else jsonb_build_object(
      'number', q.quote_number,
      'title', q.title,
      'status', q.status,
      'quoteDate', q.quote_date,
      'expiresOn', q.expires_on,
      'expired', false,
      'message', q.customer_message,
      'terms', q.terms,
      'acceptedAt', q.accepted_at,
      'acceptedByName', q.accepted_by_name,
      'totals', jsonb_build_object(
        'subtotal', q.subtotal,
        'discount', q.discount_amount,
        'tax', q.tax_amount,
        'total', q.total,
        'deposit', q.deposit_amount,
        'taxValue', q.tax_value,
        'taxType', q.tax_type,
        'depositValue', q.deposit_value,
        'depositType', q.deposit_type
      ),
      'depositReceived', case when q.deposit_received_at is not null then q.deposit_received_amount end,
      'customer', jsonb_build_object('name', c.name, 'address', c.full_address),
      'business', b.business,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'description', i.description,
          'quantity', i.quantity,
          'unitPrice', i.unit_price,
          'taxable', i.taxable
        ) order by i.position)
        from public.quote_items i where i.quote_id = q.id
      ), '[]'::jsonb),
      'attachments', coalesce((
        select jsonb_agg(jsonb_build_object('name', a.name, 'path', a.path, 'sizeBytes', a.size_bytes) order by a.created_at)
        from public.quote_attachments a where a.quote_id = q.id and not a.internal
      ), '[]'::jsonb)
    )
  end
  from public.quotes q
  join public.customers c on c.id = q.customer_id
  join public.profiles p on p.id = q.owner_id
  cross join lateral (
    select jsonb_build_object(
      'name', p.legal_business_name,
      'street', case when p.show_address_on_docs then p.street_address end,
      'city', case when p.show_address_on_docs then p.city end,
      'state', case when p.show_address_on_docs then p.state end,
      'zip', case when p.show_address_on_docs then p.zip_code end,
      'phone', case when p.show_contact_on_docs then p.business_phone end,
      'email', case when p.show_contact_on_docs then p.business_email end,
      'website', case when p.show_website_on_docs then p.website_url end
    ) as business
  ) b
  where q.public_token = p_token
    and q.status <> 'draft'
    and q.archived_at is null;
$$;

create or replace function public.get_public_invoice(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'number', i.invoice_number,
    'title', i.title,
    'status', i.status,
    'invoiceDate', i.invoice_date,
    'dueOn', i.due_on,
    'dueDays', i.due_days,
    'today', current_date,
    'message', i.customer_message,
    'terms', i.terms,
    'paidAt', i.paid_at,
    'quoteNumber', q.quote_number,
    'totals', jsonb_build_object(
      'subtotal', i.subtotal,
      'discount', i.discount_amount,
      'tax', i.tax_amount,
      'total', i.total,
      'depositCredit', i.deposit_credit,
      'amountPaid', i.amount_paid,
      'taxValue', i.tax_value,
      'taxType', i.tax_type
    ),
    'customer', jsonb_build_object('name', c.name, 'email', c.email, 'phone', c.phone, 'address', c.full_address),
    'business', jsonb_build_object(
      'name', p.legal_business_name,
      'street', case when p.show_address_on_docs then p.street_address end,
      'city', case when p.show_address_on_docs then p.city end,
      'state', case when p.show_address_on_docs then p.state end,
      'zip', case when p.show_address_on_docs then p.zip_code end,
      'phone', case when p.show_contact_on_docs then p.business_phone end,
      'email', case when p.show_contact_on_docs then p.business_email end,
      'website', case when p.show_website_on_docs then p.website_url end
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'description', it.description,
        'quantity', it.quantity,
        'unitPrice', it.unit_price,
        'taxable', it.taxable
      ) order by it.position)
      from public.invoice_items it where it.invoice_id = i.id
    ), '[]'::jsonb),
    'attachments', coalesce((
      select jsonb_agg(jsonb_build_object('name', a.name, 'path', a.path, 'sizeBytes', a.size_bytes) order by a.created_at)
      from public.invoice_attachments a where a.invoice_id = i.id and not a.internal
    ), '[]'::jsonb)
  )
  from public.invoices i
  join public.customers c on c.id = i.customer_id
  join public.profiles p on p.id = i.owner_id
  left join public.quotes q on q.id = i.quote_id
  where i.public_token = p_token
    and i.status <> 'draft'
    and i.archived_at is null;
$$;
