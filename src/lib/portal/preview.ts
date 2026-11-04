import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicInvoice, PublicInvoiceState } from "./invoices";
import type { PublicBusiness, PublicQuote } from "./quotes";

// "Preview as Customer" for the business owner. These build the same data the
// customer links show (get_public_quote / get_public_invoice), but read through
// the owner's own access so drafts can be previewed before they're sent.

const num = (v: unknown) => Number(v) || 0;

type ProfileDocFields = {
  legal_business_name: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  business_phone: string | null;
  business_email: string | null;
  website_url: string | null;
  show_address_on_docs: boolean | null;
  show_contact_on_docs: boolean | null;
  show_website_on_docs: boolean | null;
};

async function businessFor(supabase: SupabaseClient, ownerId: string): Promise<PublicBusiness> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "legal_business_name, street_address, city, state, zip_code, business_phone, business_email, website_url, show_address_on_docs, show_contact_on_docs, show_website_on_docs",
    )
    .eq("id", ownerId)
    .maybeSingle<ProfileDocFields>();
  const p = data;
  return {
    name: p?.legal_business_name ?? null,
    street: p?.show_address_on_docs ? p.street_address : null,
    city: p?.show_address_on_docs ? p.city : null,
    state: p?.show_address_on_docs ? p.state : null,
    zip: p?.show_address_on_docs ? p.zip_code : null,
    phone: p?.show_contact_on_docs ? p.business_phone : null,
    email: p?.show_contact_on_docs ? p.business_email : null,
    website: p?.show_website_on_docs ? p.website_url : null,
  };
}

type Item = { description: string; quantity: number; unit_price: number; taxable: boolean; position: number };
type File = { name: string; path: string; size_bytes: number | null; internal: boolean; created_at: string };

const items = (rows: Item[] | null) =>
  [...(rows ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ description: i.description, quantity: num(i.quantity), unitPrice: num(i.unit_price), taxable: i.taxable }));

// Customers never see internal files.
const files = (rows: File[] | null) =>
  [...(rows ?? [])]
    .filter((a) => !a.internal)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((a) => ({ name: a.name, path: a.path, sizeBytes: a.size_bytes }));

/** The owner's quote as the customer will see it, or null if it isn't theirs. Drafts show as sent. */
export async function getQuotePreview(supabase: SupabaseClient, id: string): Promise<{ quote: PublicQuote; draft: boolean } | null> {
  const { data: q } = await supabase
    .from("quotes")
    .select(
      "owner_id, quote_number, title, status, quote_date, expires_on, customer_message, terms, accepted_at, accepted_by_name, subtotal, discount_amount, tax_amount, total, deposit_amount, tax_value, tax_type, deposit_value, deposit_type, deposit_received_at, deposit_received_amount, customers(name, full_address), quote_items(description, quantity, unit_price, taxable, position), quote_attachments(name, path, size_bytes, internal, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!q) return null;
  const customer = q.customers as unknown as { name: string; full_address: string | null } | null;

  const quote: PublicQuote = {
    number: q.quote_number,
    title: q.title,
    status: q.status === "accepted" || q.status === "declined" ? q.status : "sent",
    quoteDate: q.quote_date,
    expiresOn: q.expires_on,
    expired: false,
    message: q.customer_message,
    terms: q.terms,
    acceptedAt: q.accepted_at,
    acceptedByName: q.accepted_by_name,
    totals: {
      subtotal: num(q.subtotal),
      discount: num(q.discount_amount),
      tax: num(q.tax_amount),
      total: num(q.total),
      deposit: num(q.deposit_amount),
      taxValue: num(q.tax_value),
      taxType: q.tax_type,
      depositValue: num(q.deposit_value),
      depositType: q.deposit_type,
    },
    depositReceived: q.deposit_received_at ? num(q.deposit_received_amount) : null,
    customer: { name: customer?.name ?? "", address: customer?.full_address ?? null },
    business: await businessFor(supabase, q.owner_id),
    items: items(q.quote_items as unknown as Item[]),
    attachments: files(q.quote_attachments as unknown as File[]),
  };
  return { quote, draft: q.status === "draft" };
}

/** The owner's invoice as the customer will see it, or null if it isn't theirs. Drafts show as sent. */
export async function getInvoicePreview(supabase: SupabaseClient, id: string): Promise<{ invoice: PublicInvoice; draft: boolean } | null> {
  const { data: i } = await supabase
    .from("invoices")
    .select(
      "owner_id, invoice_number, title, status, invoice_date, due_on, due_days, customer_message, terms, paid_at, subtotal, discount_amount, tax_amount, total, deposit_credit, amount_paid, tax_value, tax_type, customers(name, email, phone, full_address), quotes(quote_number), invoice_items(description, quantity, unit_price, taxable, position), invoice_attachments(name, path, size_bytes, internal, created_at)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!i) return null;
  const customer = i.customers as unknown as { name: string; email: string | null; phone: string | null; full_address: string | null } | null;
  const quote = i.quotes as unknown as { quote_number: string } | null;

  const totals = {
    subtotal: num(i.subtotal),
    discount: num(i.discount_amount),
    tax: num(i.tax_amount),
    total: num(i.total),
    depositCredit: num(i.deposit_credit),
    amountPaid: num(i.amount_paid),
    taxValue: num(i.tax_value),
    taxType: i.tax_type,
  };
  // Same rules as getPublicInvoice.
  const balance = Math.max(0, Math.round((totals.total - totals.depositCredit - totals.amountPaid) * 100) / 100);
  const today = new Date().toISOString().slice(0, 10);
  const state: PublicInvoiceState = i.status === "void" ? "void" : balance <= 0 ? "paid" : i.due_on < today ? "past_due" : "outstanding";

  const invoice: PublicInvoice = {
    number: i.invoice_number,
    title: i.title,
    status: i.status === "void" ? "void" : "sent",
    invoiceDate: i.invoice_date,
    dueOn: i.due_on,
    dueDays: num(i.due_days),
    message: i.customer_message,
    terms: i.terms,
    paidAt: i.paid_at,
    quoteNumber: quote?.quote_number ?? null,
    totals,
    balance,
    state,
    customer: { name: customer?.name ?? "", email: customer?.email ?? null, phone: customer?.phone ?? null, address: customer?.full_address ?? null },
    business: await businessFor(supabase, i.owner_id),
    items: items(i.invoice_items as unknown as Item[]),
    attachments: files(i.invoice_attachments as unknown as File[]),
  };
  return { invoice, draft: i.status === "draft" };
}
