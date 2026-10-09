import type { SupabaseClient } from "@supabase/supabase-js";
import type { AmountType } from "./totals";

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";
/** What the list and badges show: an archived quote reads as Archived whatever its status. */
export type QuoteState = QuoteStatus | "archived";

export const QUOTE_FILTERS: { value: QuoteState; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "archived", label: "Archived" },
];

const LABELS: Record<QuoteState, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  archived: "Archived",
};
export const quoteStateLabel = (s: QuoteState) => LABELS[s] ?? s;

export const DEPOSIT_METHODS = ["Bank Transfer", "Check", "Cash", "Card (in person)", "Other"];

export type QuoteRow = {
  id: string;
  number: string;
  customer: string;
  title: string | null;
  total: number;
  deposit: number;
  state: QuoteState;
  createdAt: string;
  sentAt: string | null;
  expiresOn: string | null;
  job: { id: string; number: string } | null;
};

export type QuoteStats = { drafts30d: number; sent30d: number; approved30d: number; closeRate: number | null };

type QuoteListRow = {
  id: string;
  quote_number: string;
  title: string | null;
  total: number;
  deposit_amount: number;
  status: QuoteStatus;
  archived_at: string | null;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  expires_on: string | null;
  customers: { name: string } | null;
  jobs: { id: string; job_number: string }[] | null;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Every quote, archived included (the page filters in the browser), plus the
 * 30-day stat cards. `now` keeps the server render and browser in step.
 */
export async function listQuotes(supabase: SupabaseClient): Promise<{ quotes: QuoteRow[]; stats: QuoteStats; now: number }> {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, title, total, deposit_amount, status, archived_at, created_at, sent_at, accepted_at, expires_on, customers(name), jobs(id, job_number)",
    )
    .order("created_at", { ascending: false })
    .returns<QuoteListRow[]>();
  if (error) throw new Error(`Couldn't load quotes: ${error.message}`);

  const now = Date.now();
  const since = now - 30 * DAY;
  const recent = (iso: string | null) => Boolean(iso && new Date(iso).getTime() >= since);
  const rows = data ?? [];
  const sentRecently = rows.filter((q) => recent(q.sent_at));

  return {
    now,
    stats: {
      drafts30d: rows.filter((q) => q.status === "draft" && !q.archived_at && recent(q.created_at)).length,
      sent30d: sentRecently.length,
      approved30d: rows.filter((q) => recent(q.accepted_at)).length,
      // Of the quotes sent in the window, the share that were accepted.
      closeRate: sentRecently.length
        ? (sentRecently.filter((q) => q.status === "accepted").length / sentRecently.length) * 100
        : null,
    },
    quotes: rows.map((q) => ({
      id: q.id,
      number: q.quote_number,
      customer: q.customers?.name ?? "—",
      title: q.title,
      total: Number(q.total),
      deposit: Number(q.deposit_amount),
      state: q.archived_at ? "archived" : q.status,
      createdAt: q.created_at,
      sentAt: q.sent_at,
      expiresOn: q.expires_on,
      job: q.jobs?.[0] ? { id: q.jobs[0].id, number: q.jobs[0].job_number } : null,
    })),
  };
}

/** Next number in the Q-1001, Q-1002, ... sequence, past any number already used. */
export async function nextQuoteNumber(supabase: SupabaseClient) {
  const { data } = await supabase.from("quotes").select("quote_number");
  const used = (data ?? []).map((q) => Number(/^Q-(\d+)$/.exec(q.quote_number)?.[1] ?? 0));
  return `Q-${Math.max(1000, ...used) + 1}`;
}

export type QuoteItem = { description: string; quantity: number; unitPrice: number; taxable: boolean };

export type QuoteAttachment = {
  id: string;
  name: string;
  sizeBytes: number | null;
  contentType: string | null;
  internal: boolean;
  createdAt: string;
};

export type QuoteDetail = {
  id: string;
  number: string;
  customerId: string;
  title: string | null;
  status: QuoteStatus;
  state: QuoteState;
  quoteDate: string;
  expiresOn: string | null;
  message: string | null;
  terms: string | null;
  internalNotes: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Opens the customer-facing page at /q/<token>. */
  publicToken: string;
  customer: { name: string; email: string | null; phone: string | null } | null;
  job: { id: string; number: string; title: string } | null;
  adjustments: {
    discountValue: number;
    discountType: AmountType;
    taxValue: number;
    taxType: AmountType;
    depositValue: number;
    depositType: AmountType;
  };
  totals: { subtotal: number; discount: number; tax: number; total: number; deposit: number };
  depositReceived: {
    amount: number;
    at: string;
    method: string | null;
    reference: string | null;
    note: string | null;
  } | null;
  items: QuoteItem[];
  attachments: QuoteAttachment[];
};

type QuoteDetailRow = {
  id: string;
  quote_number: string;
  customer_id: string;
  title: string | null;
  status: QuoteStatus;
  archived_at: string | null;
  quote_date: string;
  expires_on: string | null;
  customer_message: string | null;
  terms: string | null;
  internal_notes: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  public_token: string;
  discount_value: number;
  discount_type: AmountType;
  tax_value: number;
  tax_type: AmountType;
  deposit_value: number;
  deposit_type: AmountType;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  deposit_amount: number;
  deposit_received_amount: number;
  deposit_received_at: string | null;
  deposit_method: string | null;
  deposit_reference: string | null;
  deposit_note: string | null;
  customers: { name: string; email: string | null; phone: string | null } | null;
  jobs: { id: string; job_number: string; title: string }[] | null;
};

export async function getQuote(supabase: SupabaseClient, id: string): Promise<QuoteDetail | null> {
  const [{ data: q }, { data: items }, { data: files }] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_number, customer_id, title, status, archived_at, quote_date, expires_on, customer_message, terms, internal_notes, sent_at, accepted_at, created_at, updated_at, public_token, discount_value, discount_type, tax_value, tax_type, deposit_value, deposit_type, subtotal, discount_amount, tax_amount, total, deposit_amount, deposit_received_amount, deposit_received_at, deposit_method, deposit_reference, deposit_note, customers(name, email, phone), jobs(id, job_number, title)",
      )
      .eq("id", id)
      .maybeSingle<QuoteDetailRow>(),
    supabase
      .from("quote_items")
      .select("description, quantity, unit_price, taxable")
      .eq("quote_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("quote_attachments")
      .select("id, name, size_bytes, content_type, internal, created_at")
      .eq("quote_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!q) return null;

  const job = q.jobs?.[0];
  return {
    id: q.id,
    number: q.quote_number,
    customerId: q.customer_id,
    title: q.title,
    status: q.status,
    state: q.archived_at ? "archived" : q.status,
    quoteDate: q.quote_date,
    expiresOn: q.expires_on,
    message: q.customer_message,
    terms: q.terms,
    internalNotes: q.internal_notes,
    sentAt: q.sent_at,
    acceptedAt: q.accepted_at,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
    publicToken: q.public_token,
    customer: q.customers,
    job: job ? { id: job.id, number: job.job_number, title: job.title } : null,
    adjustments: {
      discountValue: Number(q.discount_value),
      discountType: q.discount_type,
      taxValue: Number(q.tax_value),
      taxType: q.tax_type,
      depositValue: Number(q.deposit_value),
      depositType: q.deposit_type,
    },
    totals: {
      subtotal: Number(q.subtotal),
      discount: Number(q.discount_amount),
      tax: Number(q.tax_amount),
      total: Number(q.total),
      deposit: Number(q.deposit_amount),
    },
    depositReceived:
      q.deposit_received_at && Number(q.deposit_received_amount) > 0
        ? {
            amount: Number(q.deposit_received_amount),
            at: q.deposit_received_at,
            method: q.deposit_method,
            reference: q.deposit_reference,
            note: q.deposit_note,
          }
        : null,
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
