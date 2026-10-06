import type { SupabaseClient } from "@supabase/supabase-js";
import { balanceOf, todayIso } from "@/lib/invoices/data";

/** Recorded payments come from invoices or from quote deposits. */
export type PaymentKind = "payment" | "deposit";
export type TransactionType = PaymentKind | "refund" | "invoice";
export type TransactionStatus = "succeeded" | "partially_refunded" | "refunded" | "processing" | "awaiting";
/** Every recorded payment is manual until Stripe is connected. */
export type Channel = "manual" | "electronic";

export const REFUND_METHODS = ["Cash", "Check", "Bank Transfer", "Card (in person)", "Other"];

export const TYPE_FILTERS: { value: TransactionType; label: string }[] = [
  { value: "payment", label: "Invoice Payment" },
  { value: "deposit", label: "Deposit" },
  { value: "refund", label: "Refund" },
  { value: "invoice", label: "Awaiting Invoice" },
];

export const METHOD_FILTERS: { value: string; label: string }[] = [
  { value: "electronic", label: "Electronic" },
  { value: "manual", label: "Manual" },
];

export const STATUS_FILTERS: { value: TransactionStatus; label: string }[] = [
  { value: "succeeded", label: "Succeeded" },
  { value: "partially_refunded", label: "Partially Refunded" },
  { value: "refunded", label: "Refunded" },
  { value: "processing", label: "Processing" },
  { value: "awaiting", label: "Sent: Awaiting" },
];

const round = (n: number) => Math.round(n * 100) / 100;
const DAY = 24 * 60 * 60 * 1000;

export const paymentNumber = (n: number | null) => (n ? `PAY-${n}` : "PAY");
export const refundNumber = (n: number | null) => (n ? `REF-${n}` : "REF");

/** Payment pages use the invoice payment id, or "deposit-<quote id>" for a quote deposit. */
export const paymentHref = (kind: PaymentKind, id: string) => `/payments/${kind === "deposit" ? `deposit-${id}` : id}`;

export function statusOf(amount: number, refunded: number): TransactionStatus {
  if (refunded <= 0) return "succeeded";
  return refunded >= amount ? "refunded" : "partially_refunded";
}

export type TransactionRow = {
  key: string;
  type: TransactionType;
  number: string;
  href: string;
  /** YYYY-MM-DD the money moved (or the invoice was sent). */
  date: string;
  /** When it was recorded, for the time of day and ordering. */
  at: string;
  customer: string;
  customerEmail: string | null;
  amount: number;
  status: TransactionStatus;
  channel: Channel;
  method: string;
  related: { label: string; href: string } | null;
  /** What "Resend Receipt" acts on; missing for rows without a receipt. */
  receipt: { kind: PaymentKind | "refund"; id: string } | null;
};

export type PaymentStats = { revenue30d: number; outstanding: number; upcomingPayouts: number; nextPayout: number };

type Customer = { name: string; email: string | null } | null;
type JobRef = { id: string; job_number: string; title: string };

type PaymentListRow = {
  id: string;
  payment_number: number | null;
  amount: number;
  paid_on: string;
  method: string;
  created_at: string;
  invoices: {
    id: string;
    invoice_number: string;
    title: string | null;
    customers: Customer;
    jobs: JobRef | null;
    quotes: { id: string; quote_number: string } | null;
  } | null;
};

type DepositListRow = {
  id: string;
  quote_number: string;
  title: string | null;
  deposit_payment_number: number | null;
  deposit_received_amount: number;
  deposit_received_at: string;
  deposit_method: string | null;
  updated_at: string;
  customers: Customer;
  jobs: JobRef[] | null;
};

type RefundListRow = {
  id: string;
  refund_number: number | null;
  payment_id: string | null;
  quote_id: string | null;
  amount: number;
  refunded_on: string;
  method: string;
  created_at: string;
};

type AwaitingRow = {
  id: string;
  invoice_number: string;
  title: string | null;
  total: number;
  deposit_credit: number;
  amount_paid: number;
  sent_at: string | null;
  created_at: string;
  customers: Customer;
  jobs: JobRef | null;
};

const jobLabel = (j: JobRef) => `#${j.job_number} ${j.title}`.trim();

/**
 * The Payments transaction log: recorded payments and deposits, refunds, and
 * sent invoices still awaiting payment, newest first, plus the stat cards.
 */
export async function listTransactions(
  supabase: SupabaseClient,
): Promise<{ transactions: TransactionRow[]; stats: PaymentStats; now: number }> {
  const [payments, deposits, refunds, awaiting] = await Promise.all([
    supabase
      .from("invoice_payments")
      .select(
        "id, payment_number, amount, paid_on, method, created_at, invoices(id, invoice_number, title, customers(name, email), jobs(id, job_number, title), quotes(id, quote_number))",
      )
      .returns<PaymentListRow[]>(),
    supabase
      .from("quotes")
      .select(
        "id, quote_number, title, deposit_payment_number, deposit_received_amount, deposit_received_at, deposit_method, updated_at, customers(name, email), jobs(id, job_number, title)",
      )
      .gt("deposit_received_amount", 0)
      .returns<DepositListRow[]>(),
    supabase.from("payment_refunds").select("id, refund_number, payment_id, quote_id, amount, refunded_on, method, created_at").returns<RefundListRow[]>(),
    supabase
      .from("invoices")
      .select("id, invoice_number, title, total, deposit_credit, amount_paid, sent_at, created_at, customers(name, email), jobs(id, job_number, title)")
      .eq("status", "sent")
      .is("archived_at", null)
      .returns<AwaitingRow[]>(),
  ]);
  const failed = [payments, deposits, refunds, awaiting].find((r) => r.error);
  if (failed?.error) throw new Error(`Couldn't load payments: ${failed.error.message}`);

  const refundRows = refunds.data ?? [];
  const refundedFor = (key: "payment_id" | "quote_id", id: string) =>
    round(refundRows.filter((r) => r[key] === id).reduce((sum, r) => sum + Number(r.amount), 0));

  const rows: TransactionRow[] = [];
  const owners = new Map<string, Omit<TransactionRow, "key" | "type" | "number" | "date" | "at" | "amount" | "status" | "method" | "receipt" | "href">>();

  for (const p of payments.data ?? []) {
    const inv = p.invoices;
    const amount = Number(p.amount);
    const base = {
      customer: inv?.customers?.name ?? "—",
      customerEmail: inv?.customers?.email ?? null,
      channel: "manual" as const,
      related: inv?.jobs
        ? { label: jobLabel(inv.jobs), href: `/jobs/${inv.jobs.id}` }
        : inv
          ? { label: `#${inv.invoice_number}${inv.title ? ` ${inv.title}` : ""}`, href: `/invoices/${inv.id}` }
          : null,
    };
    owners.set(`p:${p.id}`, base);
    rows.push({
      ...base,
      key: `p:${p.id}`,
      type: "payment",
      number: paymentNumber(p.payment_number),
      href: paymentHref("payment", p.id),
      date: p.paid_on,
      at: p.created_at,
      amount,
      status: statusOf(amount, refundedFor("payment_id", p.id)),
      method: p.method,
      receipt: { kind: "payment", id: p.id },
    });
  }

  for (const q of deposits.data ?? []) {
    const amount = Number(q.deposit_received_amount);
    const job = q.jobs?.[0];
    const base = {
      customer: q.customers?.name ?? "—",
      customerEmail: q.customers?.email ?? null,
      channel: "manual" as const,
      related: job
        ? { label: jobLabel(job), href: `/jobs/${job.id}` }
        : { label: `#${q.quote_number}${q.title ? ` ${q.title}` : ""}`, href: `/quotes/${q.id}` },
    };
    owners.set(`q:${q.id}`, base);
    rows.push({
      ...base,
      key: `q:${q.id}`,
      type: "deposit",
      number: paymentNumber(q.deposit_payment_number),
      href: paymentHref("deposit", q.id),
      date: q.deposit_received_at.slice(0, 10),
      at: q.deposit_received_at,
      amount,
      status: statusOf(amount, refundedFor("quote_id", q.id)),
      method: q.deposit_method ?? "Other",
      receipt: { kind: "deposit", id: q.id },
    });
  }

  for (const r of refundRows) {
    const owner = owners.get(r.payment_id ? `p:${r.payment_id}` : `q:${r.quote_id}`);
    if (!owner) continue;
    rows.push({
      ...owner,
      key: `r:${r.id}`,
      type: "refund",
      number: refundNumber(r.refund_number),
      href: r.payment_id ? paymentHref("payment", r.payment_id) : paymentHref("deposit", r.quote_id!),
      date: r.refunded_on,
      at: r.created_at,
      amount: -Number(r.amount),
      status: "refunded",
      method: r.method,
      receipt: { kind: "refund", id: r.id },
    });
  }

  let outstanding = 0;
  for (const i of awaiting.data ?? []) {
    const balance = balanceOf({ total: Number(i.total), depositCredit: Number(i.deposit_credit), amountPaid: Number(i.amount_paid) });
    if (balance <= 0) continue;
    outstanding += balance;
    const at = i.sent_at ?? i.created_at;
    rows.push({
      key: `i:${i.id}`,
      type: "invoice",
      number: i.invoice_number,
      href: `/invoices/${i.id}`,
      date: at.slice(0, 10),
      at,
      customer: i.customers?.name ?? "—",
      customerEmail: i.customers?.email ?? null,
      amount: balance,
      status: "awaiting",
      channel: "manual",
      method: "Invoice",
      related: i.jobs ? { label: jobLabel(i.jobs), href: `/jobs/${i.jobs.id}` } : { label: `#${i.invoice_number}${i.title ? ` ${i.title}` : ""}`, href: `/invoices/${i.id}` },
      receipt: null,
    });
  }

  rows.sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at));

  const now = Date.now();
  const since = todayIso(now - 30 * DAY);
  const revenue30d = round(rows.filter((r) => r.type !== "invoice" && r.date >= since).reduce((sum, r) => sum + r.amount, 0));

  return {
    now,
    transactions: rows,
    // Payouts come from Stripe, which isn't connected yet.
    stats: { revenue30d, outstanding: round(outstanding), upcomingPayouts: 0, nextPayout: 0 },
  };
}

export type PaymentRefund = {
  id: string;
  number: string;
  amount: number;
  refundedOn: string;
  method: string;
  reference: string | null;
  note: string | null;
  receiptSentAt: string | null;
  createdAt: string;
};

export type PaymentDetail = {
  /** The id used in the page URL. */
  slug: string;
  kind: PaymentKind;
  /** The invoice payment id, or the quote id for a deposit. */
  id: string;
  number: string;
  amount: number;
  paidOn: string;
  method: string;
  reference: string | null;
  note: string | null;
  receiptSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  refunded: number;
  net: number;
  status: TransactionStatus;
  customer: { id: string; name: string; email: string | null } | null;
  invoice: { id: string; number: string; total: number; balance: number } | null;
  quote: { id: string; number: string; total: number } | null;
  job: { id: string; number: string; title: string } | null;
  refunds: PaymentRefund[];
  /** The most this payment can be edited up to: what the invoice or quote still allows. */
  maxAmount: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Splits a payment page id into its kind and record id, or null if it isn't one. */
export function parsePaymentSlug(slug: string): { kind: PaymentKind; id: string } | null {
  const id = slug.startsWith("deposit-") ? slug.slice("deposit-".length) : slug;
  if (!UUID_RE.test(id)) return null;
  return { kind: slug.startsWith("deposit-") ? "deposit" : "payment", id };
}

type RefundRow = {
  id: string;
  refund_number: number | null;
  amount: number;
  refunded_on: string;
  method: string;
  reference: string | null;
  note: string | null;
  receipt_sent_at: string | null;
  created_at: string;
};

const toRefund = (r: RefundRow): PaymentRefund => ({
  id: r.id,
  number: refundNumber(r.refund_number),
  amount: Number(r.amount),
  refundedOn: r.refunded_on,
  method: r.method,
  reference: r.reference,
  note: r.note,
  receiptSentAt: r.receipt_sent_at,
  createdAt: r.created_at,
});

const REFUND_COLUMNS = "id, refund_number, amount, refunded_on, method, reference, note, receipt_sent_at, created_at";

export async function getPayment(supabase: SupabaseClient, slug: string): Promise<PaymentDetail | null> {
  const parsed = parsePaymentSlug(slug);
  if (!parsed) return null;
  const { kind, id } = parsed;

  if (kind === "payment") {
    const [{ data: p }, { data: refunds }] = await Promise.all([
      supabase
        .from("invoice_payments")
        .select(
          "id, payment_number, amount, paid_on, method, reference, note, receipt_sent_at, created_at, updated_at, invoices(id, invoice_number, customer_id, total, deposit_credit, amount_paid, customers(name, email), jobs(id, job_number, title), quotes(id, quote_number, total))",
        )
        .eq("id", id)
        .maybeSingle<{
          id: string;
          payment_number: number | null;
          amount: number;
          paid_on: string;
          method: string;
          reference: string | null;
          note: string | null;
          receipt_sent_at: string | null;
          created_at: string;
          updated_at: string;
          invoices: {
            id: string;
            invoice_number: string;
            customer_id: string;
            total: number;
            deposit_credit: number;
            amount_paid: number;
            customers: Customer;
            jobs: JobRef | null;
            quotes: { id: string; quote_number: string; total: number } | null;
          } | null;
        }>(),
      supabase.from("payment_refunds").select(REFUND_COLUMNS).eq("payment_id", id).order("created_at", { ascending: true }).returns<RefundRow[]>(),
    ]);
    if (!p) return null;
    const inv = p.invoices;
    const list = (refunds ?? []).map(toRefund);
    const amount = Number(p.amount);
    const refunded = round(list.reduce((sum, r) => sum + r.amount, 0));
    const balance = inv ? balanceOf({ total: Number(inv.total), depositCredit: Number(inv.deposit_credit), amountPaid: Number(inv.amount_paid) }) : 0;
    return {
      slug,
      kind,
      id: p.id,
      number: paymentNumber(p.payment_number),
      amount,
      paidOn: p.paid_on,
      method: p.method,
      reference: p.reference,
      note: p.note,
      receiptSentAt: p.receipt_sent_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      refunded,
      net: round(amount - refunded),
      status: statusOf(amount, refunded),
      customer: inv?.customers ? { id: inv.customer_id, name: inv.customers.name, email: inv.customers.email } : null,
      invoice: inv ? { id: inv.id, number: inv.invoice_number, total: Number(inv.total), balance } : null,
      quote: inv?.quotes ? { id: inv.quotes.id, number: inv.quotes.quote_number, total: Number(inv.quotes.total) } : null,
      job: inv?.jobs ? { id: inv.jobs.id, number: inv.jobs.job_number, title: inv.jobs.title } : null,
      refunds: list,
      // The payment can grow by whatever the invoice still owes.
      maxAmount: round(amount + balance),
    };
  }

  const [{ data: q }, { data: refunds }, { data: invoice }] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_number, customer_id, total, deposit_payment_number, deposit_received_amount, deposit_received_at, deposit_method, deposit_reference, deposit_note, deposit_receipt_sent_at, created_at, updated_at, customers(name, email), jobs(id, job_number, title)",
      )
      .eq("id", id)
      .gt("deposit_received_amount", 0)
      .maybeSingle<{
        id: string;
        quote_number: string;
        customer_id: string;
        total: number;
        deposit_payment_number: number | null;
        deposit_received_amount: number;
        deposit_received_at: string;
        deposit_method: string | null;
        deposit_reference: string | null;
        deposit_note: string | null;
        deposit_receipt_sent_at: string | null;
        created_at: string;
        updated_at: string;
        customers: Customer;
        jobs: JobRef[] | null;
      }>(),
    supabase.from("payment_refunds").select(REFUND_COLUMNS).eq("quote_id", id).order("created_at", { ascending: true }).returns<RefundRow[]>(),
    supabase
      .from("invoices")
      .select("id, invoice_number, total, deposit_credit, amount_paid")
      .eq("quote_id", id)
      .neq("status", "void")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; invoice_number: string; total: number; deposit_credit: number; amount_paid: number }>(),
  ]);
  if (!q) return null;
  const list = (refunds ?? []).map(toRefund);
  const amount = Number(q.deposit_received_amount);
  const refunded = round(list.reduce((sum, r) => sum + r.amount, 0));
  const job = q.jobs?.[0];
  return {
    slug,
    kind,
    id: q.id,
    number: paymentNumber(q.deposit_payment_number),
    amount,
    paidOn: q.deposit_received_at.slice(0, 10),
    method: q.deposit_method ?? "Other",
    reference: q.deposit_reference,
    note: q.deposit_note,
    receiptSentAt: q.deposit_receipt_sent_at,
    createdAt: q.deposit_received_at,
    updatedAt: q.updated_at,
    refunded,
    net: round(amount - refunded),
    status: statusOf(amount, refunded),
    customer: q.customers ? { id: q.customer_id, name: q.customers.name, email: q.customers.email } : null,
    invoice: invoice
      ? {
          id: invoice.id,
          number: invoice.invoice_number,
          total: Number(invoice.total),
          balance: balanceOf({ total: Number(invoice.total), depositCredit: Number(invoice.deposit_credit), amountPaid: Number(invoice.amount_paid) }),
        }
      : null,
    quote: { id: q.id, number: q.quote_number, total: Number(q.total) },
    job: job ? { id: job.id, number: job.job_number, title: job.title } : null,
    refunds: list,
    maxAmount: Number(q.total),
  };
}
