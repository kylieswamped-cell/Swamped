-- Customer-facing quote page (/q/<token>). Customers aren't signed in, so the
-- page reads and accepts a quote through security-definer functions keyed by
-- an unguessable per-quote token instead of row-level security.

alter table public.quotes
  add column public_token uuid not null default gen_random_uuid(),
  add column customer_accepted_at timestamptz;

create unique index quotes_public_token_idx on public.quotes (public_token);

-- Everything the customer sees on one quote, or null when the link is wrong or
-- the quote hasn't been sent (drafts and archived quotes stay private).
create or replace function public.get_public_quote(p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'number', q.quote_number,
    'title', q.title,
    'status', q.status,
    'quoteDate', q.quote_date,
    'expiresOn', q.expires_on,
    'expired', q.status = 'sent' and q.expires_on is not null and q.expires_on < current_date,
    'message', q.customer_message,
    'terms', q.terms,
    'acceptedAt', q.accepted_at,
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
    'customer', jsonb_build_object('name', c.name, 'address', c.street_address),
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
  from public.quotes q
  join public.customers c on c.id = q.customer_id
  join public.profiles p on p.id = q.owner_id
  where q.public_token = p_token
    and q.status <> 'draft'
    and q.archived_at is null;
$$;

-- The customer approves a sent quote. Returns the quote's status afterwards,
-- or an error code the page turns into a message.
create or replace function public.accept_public_quote(p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  q public.quotes%rowtype;
begin
  select * into q from public.quotes
  where public_token = p_token and status <> 'draft' and archived_at is null
  for update;

  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if q.status = 'accepted' then return jsonb_build_object('status', 'accepted'); end if;
  if q.status = 'declined' then return jsonb_build_object('error', 'declined'); end if;
  if q.expires_on is not null and q.expires_on < current_date then
    return jsonb_build_object('error', 'expired');
  end if;

  update public.quotes
  set status = 'accepted', customer_accepted_at = now()
  where id = q.id;
  return jsonb_build_object('status', 'accepted');
end;
$$;

revoke all on function public.get_public_quote(uuid) from public;
revoke all on function public.accept_public_quote(uuid) from public;
grant execute on function public.get_public_quote(uuid) to anon, authenticated;
grant execute on function public.accept_public_quote(uuid) to anon, authenticated;

-- Let the customer page open the quote's customer-facing files. A file's path
-- only ever reaches a customer through get_public_quote, and paths carry the
-- owner id and a random prefix, so they can't be guessed. The check runs as
-- definer because customers can't see quote rows themselves.
create or replace function public.is_public_quote_file(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.quote_attachments a
    join public.quotes q on q.id = a.quote_id
    where a.path = p_path
      and not a.internal
      and q.status <> 'draft'
      and q.archived_at is null
  );
$$;

revoke all on function public.is_public_quote_file(text) from public;
grant execute on function public.is_public_quote_file(text) to anon, authenticated;

create policy "Customers read files on sent quotes" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'attachments' and public.is_public_quote_file(name));
