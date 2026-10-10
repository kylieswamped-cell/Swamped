import type { SupabaseClient } from "@supabase/supabase-js";
import type { AmountType } from "@/lib/quotes/totals";

export type InvoiceStatus = "draft" | "sent" | "void";
/** What the list and badges show, worked out from the status, amounts, and due date. */
export type InvoiceState = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void" | "archived";

export const INVOICE_FILTERS: { value: InvoiceState; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
  { value: "archived", label: "Archived" },
];

const LABELS: Record<InvoiceState, string> = {
  draft: "Draft",
  sent: "Awaiting Payment",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
  archived: "Archived",
};
export const invoiceStateLabel = (s: InvoiceState) => LABELS[s] ?? s;

export const PAYMENT_METHODS = ["Bank Transfer", "Check", "Cash", "Card (in person)", "Other"];

/** "Net N days" choices for the due date. */
export const DUE_TERMS = [0, 7, 14, 15, 30, 45, 60, 90];
export const dueTermLabel = (days: number) => (days === 0 ? "Due on receipt" : `Net ${days} days`);

const round = (n: number) => Math.round(n * 100) / 100;

/** What the customer still owes after any quote deposit and recorded payments. */
export const balanceOf = (i: { total: number; depositCredit: number; amountPaid: number }) =>
  Math.max(0, round(i.total - i.depositCredit - i.amountPaid));

/** Today as YYYY-MM-DD in UTC, which due dates are compared against. */
export const todayIso = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

type StateInput = {
  status: InvoiceStatus;
  archived_at: string | null;
  due_on: string;
  total: number;
  deposit_credit: number;
  amount_paid: number;
};

export function stateOf(row: StateInput, today: string): InvoiceState {
  if (row.archived_at) return "archived";
  if (row.status === "void") return "void";
  if (row.status === "draft") return "draft";
  const balance = balanceOf({ total: Number(row.total), depositCredit: Number(row.deposit_credit), amountPaid: Number(row.amount_paid) });
  if (balance <= 0) return "paid";
  if (row.due_on < today) return "overdue";
  if (Number(row.amount_paid) > 0) return "partially_paid";
  return "sent";
}

export type InvoiceRow = {
  id: string;
  number: string;
  customer: string;
  customerEmail: string | null;
  title: string | null;
  total: number;
  amountPaid: number;
  balance: number;
  state: InvoiceState;
  createdAt: string;
  sentAt: string | null;
  dueOn: string;
};

export type InvoiceStats = { created30d: number; paid30d: number; outstanding: number; overdue: number };

type InvoiceListRow = StateInput & {
  id: string;
  invoice_number: string;
  title: string | null;
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  customers: { name: string; email: string | null } | null;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Every invoice, archived included (the page filters in the browser), plus the
 * stat cards. `now` keeps the server render and browser in step.
 */
export async function listInvoices(supabase: SupabaseClient): Promise<{ invoices: InvoiceRow[]; stats: InvoiceStats; now: number }> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, title, total, deposit_credit, amount_paid, status, archived_at, due_on, created_at, sent_at, paid_at, customers(name, email)")
    .order("created_at", { ascending: false })
    .returns<InvoiceListRow[]>();
  if (error) throw new Error(`Couldn't load invoices: ${error.message}`);

  const now = Date.now();
  const today = todayIso(now);
  const since = now - 30 * DAY;
  const recent = (iso: string | null) => Boolean(iso && new Date(iso).getTime() >= since);

  const invoices = (data ?? []).map((i) => ({
    id: i.id,
    number: i.invoice_number,
    customer: i.customers?.name ?? "—",
    customerEmail: i.customers?.email ?? null,
    title: i.title,
    total: Number(i.total),
    amountPaid: round(Number(i.amount_paid) + Number(i.deposit_credit)),
    balance: balanceOf({ total: Number(i.total), depositCredit: Number(i.deposit_credit), amountPaid: Number(i.amount_paid) }),
    state: stateOf(i, today),
    createdAt: i.created_at,
    sentAt: i.sent_at,
    dueOn: i.due_on,
  }));
  const owed = (states: InvoiceState[]) => round(invoices.filter((i) => states.includes(i.state)).reduce((sum, i) => sum + i.balance, 0));

  return {
    now,
    invoices,
    stats: {
      created30d: (data ?? []).filter((i) => recent(i.created_at)).length,
      paid30d: (data ?? []).filter((i) => i.status !== "void" && recent(i.paid_at)).length,
      outstanding: owed(["sent", "partially_paid", "overdue"]),
      overdue: owed(["overdue"]),
    },
  };
}

/** Next number in the INV-2026-001, INV-2026-002, ... sequence for this year. */
export async function nextInvoiceNumber(supabase: SupabaseClient) {
  const year = new Date().getUTCFullYear();
  const { data } = await supabase.from("invoices").select("invoice_number");
  const re = new RegExp(`^INV-${year}-(\\d+)$`);
  const used = (data ?? []).map((i) => Number(re.exec(i.invoice_number)?.[1] ?? 0));
  return `INV-${year}-${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}

export type InvoiceItem = { description: string; quantity: number; unitPrice: number; taxable: boolean };

export type InvoiceAttachment = {
  id: string;
  name: string;
  sizeBytes: number | null;
  contentType: string | null;
  internal: boolean;
  createdAt: string;
};

export type InvoicePayment = {
  id: string;
  amount: number;
  paidOn: string;
  method: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

export type InvoiceDetail = {
  id: string;
  number: string;
  customerId: string;
  title: string | null;
  status: InvoiceStatus;
  state: InvoiceState;
  invoiceDate: string;
  dueDays: number;
  dueOn: string;
  message: string | null;
  terms: string | null;
  internalNotes: string | null;
  sentAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Opens the customer-facing page at /i/<token>. */
  publicToken: string;
  customer: { name: string; email: string | null; phone: string | null; address: string | null } | null;
  job: { id: string; number: string; title: string } | null;
  quote: { id: string; number: string } | null;
  adjustments: { discountValue: number; discountType: AmountType; taxValue: number; taxType: AmountType };
  totals: { subtotal: number; discount: number; tax: number; total: number };
  depositCredit: number;
  amountPaid: number;
  balance: number;
  items: InvoiceItem[];
  attachments: InvoiceAttachment[];
  payments: InvoicePayment[];
};

type InvoiceDetailRow = StateInput & {
  id: string;
  invoice_number: string;
  customer_id: string;
  title: string | null;
  invoice_date: string;
  due_days: number;
  customer_message: string | null;
  terms: string | null;
  internal_notes: string | null;
  sent_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
  public_token: string;
  discount_value: number;
  discount_type: AmountType;
  tax_value: number;
  tax_type: AmountType;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  customers: { name: string; email: string | null; phone: string | null; street_address: string | null } | null;
  jobs: { id: string; job_number: string; title: string } | null;
  quotes: { id: string; quote_number: string } | null;
};

export async function getInvoice(supabase: SupabaseClient, id: string, now = Date.now()): Promise<InvoiceDetail | null> {
  const [{ data: i }, { data: items }, { data: files }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, customer_id, title, status, archived_at, invoice_date, due_days, due_on, customer_message, terms, internal_notes, sent_at, paid_at, voided_at, created_at, updated_at, public_token, discount_value, discount_type, tax_value, tax_type, subtotal, discount_amount, tax_amount, total, deposit_credit, amount_paid, customers(name, email, phone, street_address), jobs(id, job_number, title), quotes(id, quote_number)",
      )
      .eq("id", id)
      .maybeSingle<InvoiceDetailRow>(),
    supabase.from("invoice_items").select("description, quantity, unit_price, taxable").eq("invoice_id", id).order("position", { ascending: true }),
    supabase
      .from("invoice_attachments")
      .select("id, name, size_bytes, content_type, internal, created_at")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("invoice_payments")
      .select("id, amount, paid_on, method, reference, note, created_at")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!i) return null;

  const total = Number(i.total);
  const depositCredit = Number(i.deposit_credit);
  const amountPaid = Number(i.amount_paid);
  return {
    id: i.id,
    number: i.invoice_number,
    customerId: i.customer_id,
    title: i.title,
    status: i.status,
    state: stateOf(i, todayIso(now)),
    invoiceDate: i.invoice_date,
    dueDays: i.due_days,
    dueOn: i.due_on,
    message: i.customer_message,
    terms: i.terms,
    internalNotes: i.internal_notes,
    sentAt: i.sent_at,
    paidAt: i.paid_at,
    voidedAt: i.voided_at,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    publicToken: i.public_token,
    customer: i.customers
      ? { name: i.customers.name, email: i.customers.email, phone: i.customers.phone, address: i.customers.street_address }
      : null,
    job: i.jobs ? { id: i.jobs.id, number: i.jobs.job_number, title: i.jobs.title } : null,
    quote: i.quotes ? { id: i.quotes.id, number: i.quotes.quote_number } : null,
    adjustments: {
      discountValue: Number(i.discount_value),
      discountType: i.discount_type,
      taxValue: Number(i.tax_value),
      taxType: i.tax_type,
    },
    totals: { subtotal: Number(i.subtotal), discount: Number(i.discount_amount), tax: Number(i.tax_amount), total },
    depositCredit,
    amountPaid,
    balance: balanceOf({ total, depositCredit, amountPaid }),
    items: (items ?? []).map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unit_price),
      taxable: it.taxable,
    })),
    attachments: (files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: f.size_bytes,
      contentType: f.content_type,
      internal: f.internal,
      createdAt: f.created_at,
    })),
    payments: (payments ?? []).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paidOn: p.paid_on,
      method: p.method,
      reference: p.reference,
      note: p.note,
      createdAt: p.created_at,
    })),
  };
}

export type LinkedInvoice = { id: string; number: string; dueOn: string; total: number; balance: number; state: InvoiceState };

/** Invoices for one job or customer, newest first, for their detail pages. */
export async function linkedInvoices(supabase: SupabaseClient, link: { jobId: string } | { customerId: string }): Promise<LinkedInvoice[]> {
  const query = supabase
    .from("invoices")
    .select("id, invoice_number, due_on, total, status, archived_at, deposit_credit, amount_paid")
    .order("created_at", { ascending: false });
  const { data } = await ("jobId" in link ? query.eq("job_id", link.jobId) : query.eq("customer_id", link.customerId)).returns<
    (StateInput & { id: string; invoice_number: string })[]
  >();
  const today = todayIso();
  return (data ?? []).map((i) => ({
    id: i.id,
    number: i.invoice_number,
    dueOn: i.due_on,
    total: Number(i.total),
    balance: balanceOf({ total: Number(i.total), depositCredit: Number(i.deposit_credit), amountPaid: Number(i.amount_paid) }),
    state: stateOf(i, today),
  }));
}
