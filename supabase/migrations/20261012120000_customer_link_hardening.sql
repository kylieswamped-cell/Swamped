-- Hardening for the customer links (/q/<token>, /i/<token>):
--  * the customer types their name to approve a quote, and we keep who
--    approved, from which IP and browser, as a record for the business;
--  * a quote nobody approved stops showing its details once it has expired.
-- Resetting a link is a plain update of public_token by the owner (RLS).

alter table public.quotes
  add column accepted_by_name text,
  add column accepted_ip text,
  add column accepted_user_agent text;

-- Same as before, except an expired quote that wasn't approved returns only
-- its number, the business contact and expired = true, without prices, items
-- or files.
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
      'customer', jsonb_build_object('name', c.name, 'address', c.street_address),
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

-- Approving now records who approved. The IP and browser come from the app
-- server, which reads them from the request.
drop function public.accept_public_quote(uuid);

create function public.accept_public_quote(p_token uuid, p_name text, p_ip text, p_user_agent text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  q public.quotes%rowtype;
  v_name text := left(trim(coalesce(p_name, '')), 120);
begin
  if length(v_name) < 2 then return jsonb_build_object('error', 'name_required'); end if;

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
  set status = 'accepted',
      customer_accepted_at = now(),
      accepted_by_name = v_name,
      accepted_ip = left(p_ip, 64),
      accepted_user_agent = left(p_user_agent, 512)
  where id = q.id;
  return jsonb_build_object('status', 'accepted');
end;
$$;

revoke all on function public.accept_public_quote(uuid, text, text, text) from public;
grant execute on function public.accept_public_quote(uuid, text, text, text) to anon, authenticated;

-- Files on an expired, unapproved quote are no longer shared either.
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
      and not (q.status = 'sent' and q.expires_on is not null and q.expires_on < current_date)
  );
$$;
