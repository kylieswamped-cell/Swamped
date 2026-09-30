import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerStatus = "Active" | "Pending" | "Completed";

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: CustomerStatus;
  createdAt: string;
};

type QuoteStatusRow = { customer_id: string; status: string };

/** Pending while a sent quote awaits a reply. "Completed" arrives with jobs. */
function statusFor(quotes: QuoteStatusRow[]): CustomerStatus {
  return quotes.some((q) => q.status === "sent") ? "Pending" : "Active";
}

/**
 * `now` is the reference time for the date filters, taken here so the page
 * render and the browser agree.
 */
export async function listCustomers(
  supabase: SupabaseClient,
  archived: boolean,
): Promise<{ customers: CustomerRow[]; now: number }> {
  let query = supabase
    .from("customers")
    .select("id, name, email, phone, street_address, created_at")
    .order("created_at", { ascending: false });
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);

  const [{ data: customers, error }, { data: quotes }] = await Promise.all([
    query,
    supabase.from("quotes").select("customer_id, status").returns<QuoteStatusRow[]>(),
  ]);
  if (error) throw new Error(`Couldn't load customers: ${error.message}`);

  const byCustomer = new Map<string, QuoteStatusRow[]>();
  for (const q of quotes ?? []) byCustomer.set(q.customer_id, [...(byCustomer.get(q.customer_id) ?? []), q]);

  const rows = (customers ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.street_address,
    status: statusFor(byCustomer.get(c.id) ?? []),
    createdAt: c.created_at,
  }));
  return { customers: rows, now: Date.now() };
}

/** Jobs, invoices, and payments aren't built yet, so these start at zero. */
export function customerStats() {
  return { totalRevenue: 0, outstandingBalance: 0, activeJobs: 0 };
}

export type CustomerQuote = {
  id: string;
  number: string;
  title: string | null;
  status: string;
  total: number;
  expiresOn: string | null;
  createdAt: string;
};

export type CustomerAttachment = {
  id: string;
  name: string;
  path: string;
  sizeBytes: number | null;
  contentType: string | null;
  createdAt: string;
};

export type CustomerDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  quotes: CustomerQuote[];
  attachments: CustomerAttachment[];
};

export async function getCustomer(supabase: SupabaseClient, id: string): Promise<CustomerDetail | null> {
  const [{ data: c }, { data: quotes }, { data: files }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, street_address, notes, archived_at, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quotes")
      .select("id, quote_number, title, status, total, expires_on, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_attachments")
      .select("id, name, path, size_bytes, content_type, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!c) return null;

  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    address: c.street_address,
    notes: c.notes,
    archived: Boolean(c.archived_at),
    createdAt: c.created_at,
    quotes: (quotes ?? []).map((q) => ({
      id: q.id,
      number: q.quote_number,
      title: q.title,
      status: q.status,
      total: Number(q.total),
      expiresOn: q.expires_on,
      createdAt: q.created_at,
    })),
    attachments: (files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      path: f.path,
      sizeBytes: f.size_bytes,
      contentType: f.content_type,
      createdAt: f.created_at,
    })),
  };
}
