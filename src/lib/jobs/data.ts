import type { SupabaseClient } from "@supabase/supabase-js";
import type { AmountType } from "@/lib/quotes/totals";

export type JobStatus = "unscheduled" | "scheduled" | "in_progress" | "completed";

export const JOB_STATUSES: { value: JobStatus; label: string }[] = [
  { value: "unscheduled", label: "Unscheduled" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export const jobStatusLabel = (s: string) => JOB_STATUSES.find((j) => j.value === s)?.label ?? s;

/** Jobs that still have work to do. */
export const ACTIVE_JOB_STATUSES: JobStatus[] = ["scheduled", "in_progress"];

export type JobRow = {
  id: string;
  number: string;
  customerId: string;
  customer: string;
  title: string;
  status: JobStatus;
  archived: boolean;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  total: number;
  quoteNumber: string | null;
  invoice: { id: string; number: string } | null;
};

export type JobStats = {
  created30d: number;
  unscheduled: number;
  inProgress: number;
  completed30d: number;
};

type JobQueryRow = {
  id: string;
  job_number: string;
  customer_id: string;
  title: string;
  status: JobStatus;
  archived_at: string | null;
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  completed_at: string | null;
  total: number;
  customers: { name: string } | null;
  quotes: { quote_number: string } | null;
  invoices: { id: string; invoice_number: string; status: string; created_at: string }[] | null;
};

/** The job's newest invoice, preferring one that isn't void. */
function latestInvoice(rows: JobQueryRow["invoices"]) {
  const sorted = [...(rows ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pick = sorted.find((i) => i.status !== "void") ?? sorted[0];
  return pick ? { id: pick.id, number: pick.invoice_number } : null;
}

/**
 * Every job, active and archived: the page filters by state in the browser.
 * `now` is the reference time for the date filters, so server and browser agree.
 */
export async function listJobs(supabase: SupabaseClient): Promise<{ jobs: JobRow[]; stats: JobStats; now: number }> {
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, job_number, customer_id, title, status, archived_at, created_at, starts_at, ends_at, completed_at, total, customers(name), quotes(quote_number), invoices(id, invoice_number, status, created_at)",
    )
    .order("created_at", { ascending: false })
    .returns<JobQueryRow[]>();
  if (error) throw new Error(`Couldn't load jobs: ${error.message}`);

  const now = Date.now();
  const since = now - 30 * 24 * 60 * 60 * 1000;
  const rows = data ?? [];
  const live = rows.filter((j) => !j.archived_at);

  return {
    now,
    stats: {
      created30d: rows.filter((j) => new Date(j.created_at).getTime() >= since).length,
      unscheduled: live.filter((j) => j.status === "unscheduled").length,
      inProgress: live.filter((j) => j.status === "in_progress").length,
      completed30d: rows.filter((j) => j.completed_at && new Date(j.completed_at).getTime() >= since).length,
    },
    jobs: rows.map((j) => ({
      id: j.id,
      number: j.job_number,
      customerId: j.customer_id,
      customer: j.customers?.name ?? "—",
      title: j.title,
      status: j.status,
      archived: Boolean(j.archived_at),
      createdAt: j.created_at,
      startsAt: j.starts_at,
      endsAt: j.ends_at,
      total: Number(j.total),
      quoteNumber: j.quotes?.quote_number ?? null,
      invoice: latestInvoice(j.invoices),
    })),
  };
}

export type JobCustomerOption = { id: string; name: string };

export async function listJobCustomers(supabase: SupabaseClient): Promise<JobCustomerOption[]> {
  const { data } = await supabase
    .from("customers")
    .select("id, name")
    .is("archived_at", null)
    .order("name", { ascending: true });
  return data ?? [];
}

/** Next number in the J-101, J-102, ... sequence, past any number already used. */
export async function nextJobNumber(supabase: SupabaseClient) {
  const { data } = await supabase.from("jobs").select("job_number");
  const used = (data ?? []).map((j) => Number(/^J-(\d+)$/.exec(j.job_number)?.[1] ?? 0));
  return `J-${Math.max(100, ...used) + 1}`;
}

export type JobItem = { description: string; quantity: number; unitPrice: number; taxable: boolean };

export type JobAttachment = {
  id: string;
  name: string;
  sizeBytes: number | null;
  contentType: string | null;
  internal: boolean;
  createdAt: string;
};

export type JobDetail = {
  id: string;
  number: string;
  customerId: string;
  title: string;
  status: JobStatus;
  startsAt: string | null;
  endsAt: string | null;
  notes: string | null;
  terms: string | null;
  internalNotes: string | null;
  sentAt: string | null;
  completedAt: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  customer: { name: string; email: string | null; phone: string | null } | null;
  quote: { id: string; number: string; date: string; total: number; status: string } | null;
  totals: {
    subtotal: number;
    discountValue: number;
    discountType: AmountType;
    discountAmount: number;
    taxValue: number;
    taxType: AmountType;
    taxAmount: number;
    total: number;
  };
  items: JobItem[];
  attachments: JobAttachment[];
};

type JobDetailRow = {
  id: string;
  job_number: string;
  customer_id: string;
  title: string;
  status: JobStatus;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
  terms: string | null;
  internal_notes: string | null;
  sent_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  subtotal: number;
  discount_value: number;
  discount_type: AmountType;
  discount_amount: number;
  tax_rate: number;
  tax_type: AmountType;
  tax_amount: number;
  total: number;
  customers: { name: string; email: string | null; phone: string | null } | null;
  quotes: { id: string; quote_number: string; quote_date: string; total: number; status: string } | null;
};

export async function getJob(supabase: SupabaseClient, id: string): Promise<JobDetail | null> {
  const [{ data: j }, { data: items }, { data: files }] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, job_number, customer_id, title, status, starts_at, ends_at, notes, terms, internal_notes, sent_at, completed_at, archived_at, created_at, updated_at, subtotal, discount_value, discount_type, discount_amount, tax_rate, tax_type, tax_amount, total, customers(name, email, phone), quotes(id, quote_number, quote_date, total, status)",
      )
      .eq("id", id)
      .maybeSingle<JobDetailRow>(),
    supabase
      .from("job_items")
      .select("description, quantity, unit_price, taxable")
      .eq("job_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("job_attachments")
      .select("id, name, size_bytes, content_type, internal, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!j) return null;

  return {
    id: j.id,
    number: j.job_number,
    customerId: j.customer_id,
    title: j.title,
    status: j.status,
    startsAt: j.starts_at,
    endsAt: j.ends_at,
    notes: j.notes,
    terms: j.terms,
    internalNotes: j.internal_notes,
    sentAt: j.sent_at,
    completedAt: j.completed_at,
    archived: Boolean(j.archived_at),
    createdAt: j.created_at,
    updatedAt: j.updated_at,
    customer: j.customers,
    quote: j.quotes
      ? {
          id: j.quotes.id,
          number: j.quotes.quote_number,
          date: j.quotes.quote_date,
          total: Number(j.quotes.total),
          status: j.quotes.status,
        }
      : null,
    totals: {
      subtotal: Number(j.subtotal),
      discountValue: Number(j.discount_value),
      discountType: j.discount_type,
      discountAmount: Number(j.discount_amount),
      taxValue: Number(j.tax_rate),
      taxType: j.tax_type,
      taxAmount: Number(j.tax_amount),
      total: Number(j.total),
    },
    items: (items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      taxable: i.taxable,
    })),
    attachments: (files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: f.size_bytes,
      contentType: f.content_type,
      internal: f.internal,
      createdAt: f.created_at,
    })),
  };
}

/** Active jobs for the stat cards elsewhere (dashboard, customers). */
export async function countActiveJobs(supabase: SupabaseClient, customerId?: string) {
  let query = supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .in("status", ACTIVE_JOB_STATUSES);
  if (customerId) query = query.eq("customer_id", customerId);
  const { count } = await query;
  return count ?? 0;
}

/** Reference time for "updated 2 hours ago", taken once on the server so render stays pure. */
export const referenceTime = () => Date.now();
