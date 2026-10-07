"use server";

import { revalidatePath } from "next/cache";
import { sendInvoiceEmail, sendPaymentReceipt } from "@/lib/email/invoiceEmail";
import type { EmailAttachment } from "@/lib/email/send";
import { getProfile } from "@/lib/onboarding/server";
import { firstNameOf, profileTemplate } from "@/lib/settings/templates";
import { formatMoney, quoteTotals, type AmountType } from "@/lib/quotes/totals";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { balanceOf, nextInvoiceNumber, PAYMENT_METHODS } from "./data";

export type InvoiceResult = { error?: string; fieldErrors?: Record<string, string>; id?: string; notice?: string };

export type InvoiceItemInput = { description: string; quantity: number; unitPrice: number; taxable: boolean };

export type InvoiceAdjustments = { discountValue: number; discountType: AmountType; taxValue: number; taxType: AmountType };

export type InvoiceInput = {
  customerId: string;
  title: string;
  /** YYYY-MM-DD */
  invoiceDate: string;
  dueDays: number;
  message: string;
  terms: string;
  internalNotes: string;
  items: InvoiceItemInput[];
  adjustments: InvoiceAdjustments;
  /** What the invoice bills for; set when made from a job or quote. */
  jobId?: string | null;
  quoteId?: string | null;
};

export type UploadedInvoiceFile = { path: string; name: string; size: number; type: string; internal: boolean };

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES: AmountType[] = ["percent", "fixed"];
const round = (n: number) => Math.round(n * 100) / 100;

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function signedInUser() {
  if (!isSupabaseConfigured) return { error: "Invoices aren't available right now." } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email_confirmed_at) return { error: "Your session has expired. Please log in again." } as const;
  return { supabase, userId: data.user.id, email: data.user.email ?? "" } as const;
}

/** YYYY-MM-DD plus whole days. */
function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const longDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function itemsError(items: InvoiceItemInput[]) {
  if (items.some((i) => !clean(i.description))) return "Every line item needs a description.";
  if (items.some((i) => !(Number(i.quantity) > 0))) return "Line item quantities must be more than 0.";
  if (items.some((i) => !(Number(i.unitPrice) >= 0))) return "Line item prices can't be negative.";
  return null;
}

function adjustmentsError(a: InvoiceAdjustments) {
  if (!a || ![a.discountType, a.taxType].every((t) => TYPES.includes(t))) return "Choose $ or % for each amount.";
  if ([a.discountValue, a.taxValue].map(Number).some((v) => !(v >= 0))) return "Amounts can't be negative.";
  if ([[a.discountType, a.discountValue], [a.taxType, a.taxValue]].some(([t, v]) => t === "percent" && Number(v) > 100)) {
    return "Percentages can't be over 100%.";
  }
  return null;
}

function validate(input: InvoiceInput) {
  const fieldErrors: Record<string, string> = {};
  if (!UUID_RE.test(input.customerId ?? "")) fieldErrors.customerId = "Select a customer.";
  if (!DATE_RE.test(input.invoiceDate ?? "")) fieldErrors.invoiceDate = "Choose the invoice date.";
  const days = Number(input.dueDays);
  if (!Number.isInteger(days) || days < 0 || days > 365) fieldErrors.dueDays = "Choose when payment is due.";
  const items = input.items ?? [];
  if (!items.length) fieldErrors.items = "Add at least one line item.";
  else {
    const problem = itemsError(items);
    if (problem) fieldErrors.items = problem;
  }
  const adj = adjustmentsError(input.adjustments);
  if (adj) fieldErrors.adjustments = adj;
  return fieldErrors;
}

const toItemRows = (items: InvoiceItemInput[]) =>
  items.map((i, position) => ({
    position,
    description: i.description.trim().slice(0, 500),
    quantity: Number(i.quantity),
    unit_price: Number(i.unitPrice),
    taxable: Boolean(i.taxable),
  }));

type ItemRow = ReturnType<typeof toItemRows>[number];

/** Totals columns for an invoice, from its items and adjustments. */
function totalsFor(items: ItemRow[], a: InvoiceAdjustments) {
  const adj = { discountValue: Number(a.discountValue), discountType: a.discountType, taxValue: Number(a.taxValue), taxType: a.taxType };
  const totals = quoteTotals(
    items.map((i) => ({ quantity: i.quantity, unitPrice: i.unit_price, taxable: i.taxable })),
    { ...adj, depositValue: 0, depositType: "fixed" },
  );
  return {
    discount_value: adj.discountValue,
    discount_type: adj.discountType,
    tax_value: adj.taxValue,
    tax_type: adj.taxType,
    subtotal: totals.subtotal,
    discount_amount: totals.discount,
    tax_amount: totals.tax,
    total: totals.total,
  };
}

function toRow(input: InvoiceInput) {
  const items = toItemRows(input.items ?? []);
  const dueDays = Number(input.dueDays);
  return {
    items,
    invoice: {
      customer_id: input.customerId,
      title: clean(input.title),
      invoice_date: input.invoiceDate,
      due_days: dueDays,
      due_on: addDays(input.invoiceDate, dueDays),
      customer_message: clean(input.message),
      terms: clean(input.terms),
      internal_notes: clean(input.internalNotes),
      ...totalsFor(items, input.adjustments),
    },
  };
}

/**
 * The job and quote an invoice links to, checked against the customer, and the
 * deposit already paid on the quote (credited against the invoice).
 */
async function linksFor(supabase: Supabase, input: Pick<InvoiceInput, "customerId" | "jobId" | "quoteId">) {
  let jobId = input.jobId && UUID_RE.test(input.jobId) ? input.jobId : null;
  let quoteId = input.quoteId && UUID_RE.test(input.quoteId) ? input.quoteId : null;
  if (jobId) {
    const { data: job } = await supabase.from("jobs").select("customer_id, quote_id").eq("id", jobId).maybeSingle();
    if (!job || job.customer_id !== input.customerId) jobId = null;
    else quoteId ??= job.quote_id;
  }
  let depositCredit = 0;
  if (quoteId) {
    const { data: quote } = await supabase.from("quotes").select("customer_id, deposit_received_amount").eq("id", quoteId).maybeSingle();
    if (!quote || quote.customer_id !== input.customerId) quoteId = null;
    else depositCredit = Number(quote.deposit_received_amount) || 0;
  }
  return { job_id: jobId, quote_id: quoteId, deposit_credit: depositCredit };
}

/** Adds the new items before removing the old ones, so a failure never leaves the invoice empty. */
async function replaceItems(supabase: Supabase, id: string, items: ItemRow[]) {
  const { data: old } = await supabase.from("invoice_items").select("id").eq("invoice_id", id);
  if (items.length) {
    const { error } = await supabase.from("invoice_items").insert(items.map((i) => ({ ...i, invoice_id: id })));
    if (error) return false;
  }
  const oldIds = (old ?? []).map((i) => i.id);
  if (oldIds.length) await supabase.from("invoice_items").delete().in("id", oldIds);
  return true;
}

/** Uploaded files must sit in the user's own invoices folder (storage policies enforce it too). */
async function attach(supabase: Supabase, userId: string, invoiceId: string, files: UploadedInvoiceFile[] | undefined) {
  const own = (files ?? []).filter(
    (f) => typeof f.path === "string" && f.path.startsWith(`${userId}/invoices/`) && !f.path.includes(".."),
  );
  if (!own.length) return null;
  const { error } = await supabase.from("invoice_attachments").insert(
    own.map((f) => ({
      invoice_id: invoiceId,
      internal: Boolean(f.internal),
      path: f.path,
      name: f.name.slice(0, 200),
      size_bytes: f.size,
      content_type: f.type || null,
    })),
  );
  return error;
}

function revalidate(id?: string) {
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/payments", "layout");
  revalidatePath("/customers", "layout");
  revalidatePath("/jobs", "layout");
  revalidatePath("/quotes", "layout");
  if (id) revalidatePath(`/invoices/${id}`);
}

export async function createInvoice(input: InvoiceInput, files: UploadedInvoiceFile[]): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { invoice, items } = toRow(input);
  const links = await linksFor(ctx.supabase, input);
  // Two invoices saved at once can race for a number; retry once with a fresh one.
  let created: { id: string } | null = null;
  for (let attempt = 0; attempt < 2 && !created; attempt++) {
    const { data, error } = await ctx.supabase
      .from("invoices")
      .insert({ ...invoice, ...links, invoice_number: await nextInvoiceNumber(ctx.supabase) })
      .select("id")
      .single();
    if (data) created = data;
    else if (error?.code !== "23505") break;
  }
  if (!created) return { error: "Couldn't create the invoice. Please try again." };

  const { error: itemsError } = await ctx.supabase.from("invoice_items").insert(items.map((i) => ({ ...i, invoice_id: created.id })));
  if (itemsError) {
    await ctx.supabase.from("invoices").delete().eq("id", created.id);
    return { error: "Couldn't save the line items. Please try again." };
  }

  const attachError = await attach(ctx.supabase, ctx.userId, created.id, files);
  revalidate(created.id);
  return { id: created.id, notice: attachError ? "Invoice saved, but the files couldn't be added." : undefined };
}

export async function updateInvoice(id: string, input: InvoiceInput, files: UploadedInvoiceFile[]): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { invoice, items } = toRow(input);
  const { data, error } = await ctx.supabase.from("invoices").update(invoice).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't save the changes. Please try again." };
  if (!(await replaceItems(ctx.supabase, id, items))) {
    return { id, error: "The invoice was saved, but its line items couldn't be. Please try again." };
  }
  const attachError = await attach(ctx.supabase, ctx.userId, id, files);
  revalidate(id);
  return { id, notice: attachError ? "Changes saved, but the files couldn't be added." : undefined };
}

/** Saves the line items edited on the invoice detail page and refreshes the totals. */
export async function saveInvoiceItems(id: string, input: InvoiceItemInput[]): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  if (!input?.length) return { error: "An invoice needs at least one line item." };
  const problem = itemsError(input);
  if (problem) return { error: problem };

  const { data: current } = await ctx.supabase
    .from("invoices")
    .select("discount_value, discount_type, tax_value, tax_type")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { error: "Couldn't find this invoice." };
  const items = toItemRows(input);
  if (!(await replaceItems(ctx.supabase, id, items))) return { error: "Couldn't save the line items. Please try again." };
  const adj = {
    discountValue: Number(current.discount_value),
    discountType: current.discount_type,
    taxValue: Number(current.tax_value),
    taxType: current.tax_type,
  };
  const { error } = await ctx.supabase.from("invoices").update(totalsFor(items, adj)).eq("id", id);
  if (error) return { error: "Couldn't update the totals. Please try again." };
  revalidate(id);
  return { id };
}

export async function saveInvoiceAdjustments(id: string, adj: InvoiceAdjustments): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const problem = adjustmentsError(adj);
  if (problem) return { error: problem };
  const { data: items } = await ctx.supabase
    .from("invoice_items")
    .select("position, description, quantity, unit_price, taxable")
    .eq("invoice_id", id);
  const rows = (items ?? []).map((i) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price) }));
  const { data, error } = await ctx.supabase.from("invoices").update(totalsFor(rows, adj)).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't update the totals. Please try again." };
  revalidate(id);
  return { id };
}

export async function saveInvoiceInternalNotes(id: string, notes: string): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase.from("invoices").update({ internal_notes: clean(notes) }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't save the internal notes. Please try again." };
  revalidate(id);
  return { id };
}

/** Mark as Sent, for an invoice sent outside Swamped. */
export async function markInvoiceSent(id: string): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error || !data?.length) return { error: "Couldn't update the invoice. Please try again." };
  revalidate(id);
  return { id };
}

/** Void cancels a sent invoice; Unvoid puts it back to awaiting payment. */
export async function setInvoiceVoid(id: string, voided: boolean): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase
    .from("invoices")
    .update(voided ? { status: "void", voided_at: new Date().toISOString() } : { status: "sent", voided_at: null })
    .eq("id", id)
    .eq("status", voided ? "sent" : "void")
    .select("id");
  if (error || !data?.length) return { error: `Couldn't ${voided ? "void" : "unvoid"} this invoice. Please try again.` };
  revalidate(id);
  return { id };
}

export async function setInvoiceArchived(id: string, archived: boolean): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase
    .from("invoices")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: `Couldn't ${archived ? "archive" : "unarchive"} this invoice. Please try again.` };
  revalidate(id);
  return { id };
}

/** Only drafts can be deleted; sent invoices are voided instead. */
export async function deleteInvoice(id: string): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data: files } = await ctx.supabase.from("invoice_attachments").select("path").eq("invoice_id", id);
  const { data, error } = await ctx.supabase.from("invoices").delete().eq("id", id).eq("status", "draft").select("id");
  if (error || !data?.length) return { error: "Couldn't delete this invoice. Only draft invoices can be deleted." };
  const paths = (files ?? []).map((f) => f.path);
  if (paths.length) await ctx.supabase.storage.from("attachments").remove(paths);
  revalidate();
  return {};
}

/** Starts an invoice from a job: its customer, items, amounts, and text. */
export async function createInvoiceFromJob(jobId: string): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const [{ data: job }, { data: items }, { data: existing }, profile] = await Promise.all([
    ctx.supabase
      .from("jobs")
      .select("customer_id, quote_id, title, notes, terms, internal_notes, discount_value, discount_type, tax_rate, tax_type")
      .eq("id", jobId)
      .maybeSingle(),
    ctx.supabase.from("job_items").select("description, quantity, unit_price, taxable").eq("job_id", jobId).order("position"),
    ctx.supabase.from("invoices").select("id").eq("job_id", jobId).neq("status", "void").limit(1),
    getProfile(ctx.supabase, ctx.userId),
  ]);
  if (!job) return { error: "Couldn't find this job." };
  if (existing?.length) return { id: existing[0].id, notice: "This job already has an invoice." };
  if (!items?.length) return { error: "Add line items to the job before invoicing it." };

  return createInvoice(
    {
      customerId: job.customer_id,
      jobId,
      quoteId: job.quote_id,
      title: job.title,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDays: profile.invoice_due_days,
      message: job.notes ?? "",
      terms: profile.invoice_terms ?? job.terms ?? "",
      internalNotes: job.internal_notes ?? "",
      items: items.map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unit_price), taxable: i.taxable })),
      adjustments: {
        discountValue: Number(job.discount_value),
        discountType: job.discount_type,
        taxValue: Number(job.tax_rate),
        taxType: job.tax_type,
      },
    },
    [],
  );
}

/** Starts an invoice from an accepted quote, crediting any deposit already paid. */
export async function createInvoiceFromQuote(quoteId: string): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const [{ data: q }, { data: items }, { data: existing }, { data: jobs }, profile] = await Promise.all([
    ctx.supabase
      .from("quotes")
      .select("customer_id, title, customer_message, internal_notes, discount_value, discount_type, tax_value, tax_type")
      .eq("id", quoteId)
      .maybeSingle(),
    ctx.supabase.from("quote_items").select("description, quantity, unit_price, taxable").eq("quote_id", quoteId).order("position"),
    ctx.supabase.from("invoices").select("id").eq("quote_id", quoteId).neq("status", "void").limit(1),
    ctx.supabase.from("jobs").select("id").eq("quote_id", quoteId).limit(1),
    getProfile(ctx.supabase, ctx.userId),
  ]);
  if (!q) return { error: "Couldn't find this quote." };
  if (existing?.length) return { id: existing[0].id, notice: "This quote already has an invoice." };

  return createInvoice(
    {
      customerId: q.customer_id,
      quoteId,
      jobId: jobs?.[0]?.id ?? null,
      title: q.title ?? "",
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDays: profile.invoice_due_days,
      message: q.customer_message ?? "",
      terms: profile.invoice_terms ?? "",
      internalNotes: q.internal_notes ?? "",
      items: (items ?? []).map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unit_price), taxable: i.taxable })),
      adjustments: {
        discountValue: Number(q.discount_value),
        discountType: q.discount_type,
        taxValue: Number(q.tax_value),
        taxType: q.tax_type,
      },
    },
    [],
  );
}

/** What the Preview Invoice email opens with. */
export async function invoiceEmailDraft(id: string): Promise<{ to?: string; subject?: string; message?: string; files?: { name: string; sizeBytes: number | null }[]; error?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const [{ data: i }, { data: files }, profile] = await Promise.all([
    ctx.supabase.from("invoices").select("invoice_number, title, due_on, total, customer_message, customers(name, email)").eq("id", id).maybeSingle<{
      invoice_number: string;
      title: string | null;
      due_on: string;
      total: number;
      customer_message: string | null;
      customers: { name: string; email: string | null } | null;
    }>(),
    ctx.supabase.from("invoice_attachments").select("name, size_bytes").eq("invoice_id", id).eq("internal", false),
    getProfile(ctx.supabase, ctx.userId),
  ]);
  if (!i) return { error: "Couldn't find this invoice." };
  const business = profile.legal_business_name || "Swamped";
  const email = profileTemplate(profile.email_templates, "invoice", {
    customerFirstName: firstNameOf(i.customers?.name),
    customerName: i.customers?.name ?? "there",
    businessName: business,
    senderName: profile.contact_name || business,
    invoiceNumber: i.invoice_number,
    invoiceTotal: formatMoney(Number(i.total)),
    dueDate: longDate(i.due_on),
  });
  return {
    to: i.customers?.email ?? "",
    subject: email.subject,
    message: i.customer_message ?? email.body,
    files: (files ?? []).map((f) => ({ name: f.name, sizeBytes: f.size_bytes })),
  };
}

const MAX_EMAIL_ATTACHMENTS_BYTES = 30 * 1024 * 1024;

/** Emails the invoice with its public files and marks it sent. */
export async function sendInvoice(
  id: string,
  email: { to: string; subject: string; message: string },
): Promise<{ ok?: true; sentTo?: string; dueOn?: string; error?: string; code?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const to = email.to.trim();
  if (!EMAIL_RE.test(to)) return { error: "Enter a valid email address.", code: "ERR_INVALID_RECIPIENT" };
  if (!clean(email.subject)) return { error: "Enter a subject.", code: "ERR_MISSING_SUBJECT" };

  const [{ data: i }, { data: items }, { data: files }, profile] = await Promise.all([
    ctx.supabase
      .from("invoices")
      .select("invoice_number, title, due_on, terms, subtotal, discount_amount, tax_amount, total, deposit_credit, amount_paid, status, customers(name)")
      .eq("id", id)
      .maybeSingle<{
        invoice_number: string;
        title: string | null;
        due_on: string;
        terms: string | null;
        subtotal: number;
        discount_amount: number;
        tax_amount: number;
        total: number;
        deposit_credit: number;
        amount_paid: number;
        status: string;
        customers: { name: string } | null;
      }>(),
    ctx.supabase.from("invoice_items").select("description, quantity, unit_price").eq("invoice_id", id).order("position"),
    ctx.supabase.from("invoice_attachments").select("path, name, size_bytes").eq("invoice_id", id).eq("internal", false),
    getProfile(ctx.supabase, ctx.userId),
  ]);
  if (!i) return { error: "Couldn't find this invoice.", code: "ERR_INVOICE_NOT_FOUND" };
  if (i.status === "void") return { error: "Unvoid this invoice before sending it.", code: "ERR_INVOICE_VOID" };

  // Attach the customer-facing files, within the email size limit.
  const attachments: EmailAttachment[] = [];
  let size = 0;
  for (const f of files ?? []) {
    if (size + (f.size_bytes ?? 0) > MAX_EMAIL_ATTACHMENTS_BYTES) break;
    const { data: blob } = await ctx.supabase.storage.from("attachments").download(f.path);
    if (!blob) continue;
    size += blob.size;
    attachments.push({ filename: f.name, content: Buffer.from(await blob.arrayBuffer()).toString("base64") });
  }

  const sent = await sendInvoiceEmail({
    to,
    customerName: i.customers?.name ?? "there",
    businessName: profile.legal_business_name || "Your contractor",
    replyTo: profile.business_email || ctx.email,
    invoiceNumber: i.invoice_number,
    title: i.title,
    dueOn: i.due_on,
    message: clean(email.message),
    terms: i.terms,
    items: (items ?? []).map((it) => ({ description: it.description, quantity: Number(it.quantity), unitPrice: Number(it.unit_price) })),
    totals: {
      subtotal: Number(i.subtotal),
      discount: Number(i.discount_amount),
      tax: Number(i.tax_amount),
      total: Number(i.total),
      paid: round(Number(i.deposit_credit) + Number(i.amount_paid)),
      balance: balanceOf({ total: Number(i.total), depositCredit: Number(i.deposit_credit), amountPaid: Number(i.amount_paid) }),
    },
    subject: email.subject.trim().slice(0, 200),
    attachments,
  });
  if (!sent.ok) return { error: `The email wasn't sent: ${sent.reason}`, code: sent.code };

  await ctx.supabase.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
  revalidate(id);
  return { ok: true, sentTo: to, dueOn: i.due_on };
}

export type PaymentInput = { method: string; paidOn: string; reference: string; amount: number; note: string };

/** Records a payment received outside Swamped; optionally emails the customer a receipt. */
export async function recordInvoicePayment(
  id: string,
  input: PaymentInput,
  emailReceipt: boolean,
): Promise<InvoiceResult & { balance?: number; recordedAt?: string; code?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors: Record<string, string> = {};
  if (!PAYMENT_METHODS.includes(input.method)) fieldErrors.method = "Choose how the payment was made.";
  if (!DATE_RE.test(input.paidOn ?? "")) fieldErrors.paidOn = "Choose the payment date.";
  const amount = round(Number(input.amount));
  if (!(amount > 0)) fieldErrors.amount = "Enter the amount received.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { data: i } = await ctx.supabase
    .from("invoices")
    .select("invoice_number, total, deposit_credit, amount_paid, status, customers(name, email)")
    .eq("id", id)
    .maybeSingle<{
      invoice_number: string;
      total: number;
      deposit_credit: number;
      amount_paid: number;
      status: string;
      customers: { name: string; email: string | null } | null;
    }>();
  if (!i) return { error: "Couldn't find this invoice.", code: "ERR_INVOICE_NOT_FOUND" };
  if (i.status === "void") return { error: "This invoice is void.", code: "ERR_INVOICE_VOID" };
  const owed = balanceOf({ total: Number(i.total), depositCredit: Number(i.deposit_credit), amountPaid: Number(i.amount_paid) });
  if (amount > owed) return { fieldErrors: { amount: `The payment can't be more than the ${owed > 0 ? "balance" : "invoice total"}.` } };

  const { data: payment, error } = await ctx.supabase
    .from("invoice_payments")
    .insert({ invoice_id: id, amount, paid_on: input.paidOn, method: input.method, reference: clean(input.reference), note: clean(input.note) })
    .select("id, created_at")
    .single();
  if (error || !payment) return { error: "We couldn't save this manual payment record. Please try again later.", code: "ERR_PAYMENT_NOT_SAVED" };
  // Paying a draft means it reached the customer some other way.
  if (i.status === "draft") await ctx.supabase.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
  revalidate(id);

  const balance = round(owed - amount);
  const done = { id, balance, recordedAt: payment.created_at };
  if (!emailReceipt) return done;
  if (!i.customers?.email) return { ...done, notice: "Payment recorded. The customer has no email address, so no receipt was sent." };
  const profile = await getProfile(ctx.supabase, ctx.userId);
  const businessName = profile.legal_business_name || "Your contractor";
  const sent = await sendPaymentReceipt({
    to: i.customers.email,
    customerName: i.customers.name,
    businessName,
    template: profileTemplate(profile.email_templates, "invoice_receipt", {
      customerFirstName: firstNameOf(i.customers.name),
      customerName: i.customers.name,
      businessName,
      senderName: profile.contact_name || businessName,
      invoiceNumber: i.invoice_number,
      paymentAmount: formatMoney(amount),
      paymentDate: longDate(input.paidOn),
    }),
    replyTo: profile.business_email || ctx.email,
    invoiceNumber: i.invoice_number,
    amount,
    paidOn: longDate(input.paidOn),
    method: input.method,
    reference: clean(input.reference),
    remaining: balance,
  });
  if (!sent.ok) return { ...done, notice: `Payment recorded, but the receipt wasn't sent: ${sent.reason}` };
  await ctx.supabase.from("invoice_payments").update({ receipt_sent_at: new Date().toISOString() }).eq("id", payment.id);
  return done;
}

export async function addInvoiceFiles(id: string, files: UploadedInvoiceFile[]): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const error = await attach(ctx.supabase, ctx.userId, id, files);
  if (error) return { error: "Couldn't save the files. Please try again." };
  revalidate(id);
  return { id };
}

export async function deleteInvoiceFile(attachmentId: string): Promise<InvoiceResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data } = await ctx.supabase
    .from("invoice_attachments")
    .delete()
    .eq("id", attachmentId)
    .select("path, invoice_id")
    .maybeSingle();
  if (!data) return { error: "Couldn't delete the file. Please try again." };
  await ctx.supabase.storage.from("attachments").remove([data.path]);
  revalidate(data.invoice_id);
  return {};
}

/** A short-lived link to view or download one attachment. */
export async function invoiceFileUrl(attachmentId: string): Promise<{ url?: string; error?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data: row } = await ctx.supabase.from("invoice_attachments").select("path").eq("id", attachmentId).maybeSingle();
  if (!row) return { error: "File not found." };
  const { data, error } = await ctx.supabase.storage.from("attachments").createSignedUrl(row.path, 60);
  if (error || !data) return { error: "Couldn't open the file. Please try again." };
  return { url: data.signedUrl };
}
