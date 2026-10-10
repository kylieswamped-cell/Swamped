-- Customer-facing invoice page (/i/<token>), read through a security-definer
-- function keyed by an unguessable per-invoice token, like quotes (/q/<token>).

alter table public.invoices
  add column public_token uuid not null default gen_random_uuid();

create unique index invoices_public_token_idx on public.invoices (public_token);

-- Everything the customer sees on one invoice, or null when the link is wrong
-- or the invoice isn't shared (drafts and archived invoices stay private).
-- Voided invoices still open, showing that they're void.
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
    'customer', jsonb_build_object('name', c.name, 'email', c.email, 'phone', c.phone, 'address', c.street_address),
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

revoke all on function public.get_public_invoice(uuid) from public;
grant execute on function public.get_public_invoice(uuid) to anon, authenticated;

-- Customer-facing files on shared invoices, opened from the invoice page. As
-- with quotes, a path only reaches a customer through get_public_invoice.
create or replace function public.is_public_invoice_file(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.invoice_attachments a
    join public.invoices i on i.id = a.invoice_id
    where a.path = p_path
      and not a.internal
      and i.status <> 'draft'
      and i.archived_at is null
  );
$$;

revoke all on function public.is_public_invoice_file(text) from public;
grant execute on function public.is_public_invoice_file(text) to anon, authenticated;

create policy "Customers read files on sent invoices" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'attachments' and public.is_public_invoice_file(name));
