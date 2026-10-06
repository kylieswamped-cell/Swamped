"use server";

import { revalidatePath } from "next/cache";
import { sendDepositReceipt, sendQuoteEmail } from "@/lib/email/quoteEmail";
import type { EmailAttachment } from "@/lib/email/send";
import { nextJobNumber } from "@/lib/jobs/data";
import { getProfile } from "@/lib/onboarding/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { DEPOSIT_METHODS, nextQuoteNumber } from "./data";
import { quoteTotals, type AmountType } from "./totals";

export type QuoteResult = { error?: string; fieldErrors?: Record<string, string>; id?: string; notice?: string };

export type QuoteItemInput = { description: string; quantity: number; unitPrice: number; taxable: boolean };

export type QuoteAdjustments = {
  discountValue: number;
  discountType: AmountType;
  taxValue: number;
  taxType: AmountType;
  depositValue: number;
  depositType: AmountType;
};

export type QuoteInput = {
  customerId: string;
  title: string;
  /** YYYY-MM-DD */
  quoteDate: string;
  expiresOn: string;
  message: string;
  terms: string;
  internalNotes: string;
  items: QuoteItemInput[];
  adjustments: QuoteAdjustments;
};

export type UploadedQuoteFile = { path: string; name: string; size: number; type: string; internal: boolean };

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES: AmountType[] = ["percent", "fixed"];

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function signedInUser() {
  if (!isSupabaseConfigured) return { error: "Quotes aren't available right now." } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email_confirmed_at) return { error: "Your session has expired. Please log in again." } as const;
  return { supabase, userId: data.user.id, email: data.user.email ?? "" } as const;
}

function itemsError(items: QuoteItemInput[]) {
  if (items.some((i) => !clean(i.description))) return "Every line item needs a description.";
  if (items.some((i) => !(Number(i.quantity) > 0))) return "Line item quantities must be more than 0.";
  if (items.some((i) => !(Number(i.unitPrice) >= 0))) return "Line item prices can't be negative.";
  return null;
}

function adjustmentsError(a: QuoteAdjustments) {
  if (!a || ![a.discountType, a.taxType, a.depositType].every((t) => TYPES.includes(t))) return "Choose $ or % for each amount.";
  const values = [a.discountValue, a.taxValue, a.depositValue].map(Number);
  if (values.some((v) => !(v >= 0))) return "Amounts can't be negative.";
  if ([[a.discountType, a.discountValue], [a.taxType, a.taxValue], [a.depositType, a.depositValue]].some(([t, v]) => t === "percent" && Number(v) > 100)) {
    return "Percentages can't be over 100%.";
  }
  return null;
}

function validate(input: QuoteInput) {
  const fieldErrors: Record<string, string> = {};
  if (!UUID_RE.test(input.customerId ?? "")) fieldErrors.customerId = "Select a customer.";
  if (!DATE_RE.test(input.quoteDate ?? "")) fieldErrors.quoteDate = "Choose the quote date.";
  if (!DATE_RE.test(input.expiresOn ?? "")) fieldErrors.expiresOn = "Choose when the quote expires.";
  else if (DATE_RE.test(input.quoteDate ?? "") && input.expiresOn < input.quoteDate) {
    fieldErrors.expiresOn = "The quote can't expire before its date.";
  }
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

const toItemRows = (items: QuoteItemInput[]) =>
  items.map((i, position) => ({
    position,
    description: i.description.trim().slice(0, 500),
    quantity: Number(i.quantity),
    unit_price: Number(i.unitPrice),
    taxable: Boolean(i.taxable),
  }));

type ItemRow = ReturnType<typeof toItemRows>[number];

/** Totals columns for a quote, from its items and adjustments. */
function totalsFor(items: ItemRow[], a: QuoteAdjustments) {
  const adj = {
    discountValue: Number(a.discountValue),
    discountType: a.discountType,
    taxValue: Number(a.taxValue),
    taxType: a.taxType,
    depositValue: Number(a.depositValue),
    depositType: a.depositType,
  };
  const totals = quoteTotals(
    items.map((i) => ({ quantity: i.quantity, unitPrice: i.unit_price, taxable: i.taxable })),
    adj,
  );
  return {
    discount_value: adj.discountValue,
    discount_type: adj.discountType,
    tax_value: adj.taxValue,
    tax_type: adj.taxType,
    deposit_value: adj.depositValue,
    deposit_type: adj.depositType,
    subtotal: totals.subtotal,
    discount_amount: totals.discount,
    tax_amount: totals.tax,
    total: totals.total,
    deposit_amount: totals.deposit,
  };
}

function toRow(input: QuoteInput) {
  const items = toItemRows(input.items ?? []);
  return {
    items,
    quote: {
      customer_id: input.customerId,
      title: clean(input.title),
      quote_date: input.quoteDate,
      expires_on: input.expiresOn,
      customer_message: clean(input.message),
      terms: clean(input.terms),
      internal_notes: clean(input.internalNotes),
      ...totalsFor(items, input.adjustments),
    },
  };
}

/** Adds the new items before removing the old ones, so a failure never leaves the quote empty. */
async function replaceItems(supabase: Supabase, id: string, items: ItemRow[]) {
  const { data: old } = await supabase.from("quote_items").select("id").eq("quote_id", id);
  if (items.length) {
    const { error } = await supabase.from("quote_items").insert(items.map((i) => ({ ...i, quote_id: id })));
    if (error) return false;
  }
  const oldIds = (old ?? []).map((i) => i.id);
  if (oldIds.length) await supabase.from("quote_items").delete().in("id", oldIds);
  return true;
}

/** Uploaded files must sit in the user's own quotes folder (storage policies enforce it too). */
async function attach(supabase: Supabase, userId: string, quoteId: string, files: UploadedQuoteFile[] | undefined) {
  const own = (files ?? []).filter(
    (f) => typeof f.path === "string" && f.path.startsWith(`${userId}/quotes/`) && !f.path.includes(".."),
  );
  if (!own.length) return null;
  const { error } = await supabase.from("quote_attachments").insert(
    own.map((f) => ({
      quote_id: quoteId,
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
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  revalidatePath("/payments", "layout");
  revalidatePath("/customers", "layout");
  revalidatePath("/jobs", "layout");
  if (id) revalidatePath(`/quotes/${id}`);
}

export async function createQuote(input: QuoteInput, files: UploadedQuoteFile[]): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { quote, items } = toRow(input);
  // Two quotes saved at once can race for a number; retry once with a fresh one.
  let created: { id: string } | null = null;
  for (let attempt = 0; attempt < 2 && !created; attempt++) {
    const quoteNumber = await nextQuoteNumber(ctx.supabase);
    const { data, error } = await ctx.supabase
      .from("quotes")
      .insert({ ...quote, quote_number: quoteNumber })
      .select("id")
      .single();
    if (data) created = data;
    else if (error?.code !== "23505") break;
  }
  if (!created) return { error: "Couldn't create the quote. Please try again." };

  const { error: itemsError } = await ctx.supabase.from("quote_items").insert(items.map((i) => ({ ...i, quote_id: created.id })));
  if (itemsError) {
    await ctx.supabase.from("quotes").delete().eq("id", created.id);
    return { error: "Couldn't save the line items. Please try again." };
  }

  const attachError = await attach(ctx.supabase, ctx.userId, created.id, files);
  revalidate(created.id);
  return { id: created.id, notice: attachError ? "Quote saved, but the files couldn't be added." : undefined };
}

export async function updateQuote(id: string, input: QuoteInput, files: UploadedQuoteFile[]): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { quote, items } = toRow(input);
  const { data, error } = await ctx.supabase.from("quotes").update(quote).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't save the changes. Please try again." };
  if (!(await replaceItems(ctx.supabase, id, items))) {
    return { id, error: "The quote was saved, but its line items couldn't be. Please try again." };
  }
  const attachError = await attach(ctx.supabase, ctx.userId, id, files);
  revalidate(id);
  return { id, notice: attachError ? "Changes saved, but the files couldn't be added." : undefined };
}

async function adjustmentsOf(supabase: Supabase, id: string): Promise<QuoteAdjustments | null> {
  const { data } = await supabase
    .from("quotes")
    .select("discount_value, discount_type, tax_value, tax_type, deposit_value, deposit_type")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    discountValue: Number(data.discount_value),
    discountType: data.discount_type,
    taxValue: Number(data.tax_value),
    taxType: data.tax_type,
    depositValue: Number(data.deposit_value),
    depositType: data.deposit_type,
  };
}

/** Saves the line items edited on the quote detail page and refreshes the totals. */
export async function saveQuoteItems(id: string, input: QuoteItemInput[]): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  if (!input?.length) return { error: "A quote needs at least one line item." };
  const problem = itemsError(input);
  if (problem) return { error: problem };

  const adj = await adjustmentsOf(ctx.supabase, id);
  if (!adj) return { error: "Couldn't find this quote." };
  const items = toItemRows(input);
  if (!(await replaceItems(ctx.supabase, id, items))) return { error: "Couldn't save the line items. Please try again." };
  const { error } = await ctx.supabase.from("quotes").update(totalsFor(items, adj)).eq("id", id);
  if (error) return { error: "Couldn't update the totals. Please try again." };
  revalidate(id);
  return { id };
}

export async function saveQuoteInternalNotes(id: string, notes: string): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase.from("quotes").update({ internal_notes: clean(notes) }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't save the internal notes. Please try again." };
  revalidate(id);
  return { id };
}

/** Mark as Sent (sent outside Swamped) or Manually Approve. */
export async function setQuoteStatus(id: string, status: "sent" | "accepted"): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  if (status !== "sent" && status !== "accepted") return { error: "Choose a valid status." };
  const { data: current } = await ctx.supabase.from("quotes").select("sent_at").eq("id", id).maybeSingle();
  if (!current) return { error: "Couldn't find this quote." };
  const { data, error } = await ctx.supabase
    .from("quotes")
    .update({ status, sent_at: current.sent_at ?? new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: "Couldn't update the quote. Please try again." };
  revalidate(id);
  return { id };
}

export async function setQuoteArchived(id: string, archived: boolean): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase
    .from("quotes")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: `Couldn't ${archived ? "archive" : "unarchive"} this quote. Please try again.` };
  revalidate(id);
  return { id };
}

export async function deleteQuote(id: string): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data: files } = await ctx.supabase.from("quote_attachments").select("path").eq("quote_id", id);
  const { data: legacy } = await ctx.supabase.from("quotes").select("attachment_path").eq("id", id).maybeSingle();
  // Jobs made from this quote stay; they just lose the link (on delete set null).
  const { data, error } = await ctx.supabase.from("quotes").delete().eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't delete this quote. Please try again." };
  const paths = [...new Set([...(files ?? []).map((f) => f.path), legacy?.attachment_path].filter((p): p is string => Boolean(p)))];
  if (paths.length) await ctx.supabase.storage.from("attachments").remove(paths);
  revalidate();
  return {};
}

/** A new draft copy with the same customer, items, amounts, and text (files aren't copied). */
export async function duplicateQuote(id: string): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const [{ data: q }, { data: items }, profile] = await Promise.all([
    ctx.supabase
      .from("quotes")
      .select("customer_id, title, customer_message, terms, internal_notes, discount_value, discount_type, tax_value, tax_type, deposit_value, deposit_type")
      .eq("id", id)
      .maybeSingle(),
    ctx.supabase.from("quote_items").select("description, quantity, unit_price, taxable").eq("quote_id", id).order("position"),
    getProfile(ctx.supabase, ctx.userId),
  ]);
  if (!q) return { error: "Couldn't find this quote." };

  const today = new Date();
  const expires = new Date(today);
  expires.setDate(expires.getDate() + profile.quote_expiration_days);
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);
  return createQuote(
    {
      customerId: q.customer_id,
      title: q.title ? `${q.title} (Copy)` : "",
      quoteDate: isoDate(today),
      expiresOn: isoDate(expires),
      message: q.customer_message ?? "",
      terms: q.terms ?? "",
      internalNotes: q.internal_notes ?? "",
      items: (items ?? []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unit_price),
        taxable: i.taxable,
      })),
      adjustments: {
        discountValue: Number(q.discount_value),
        discountType: q.discount_type,
        taxValue: Number(q.tax_value),
        taxType: q.tax_type,
        depositValue: Number(q.deposit_value),
        depositType: q.deposit_type,
      },
    },
    [],
  );
}

/** Creates an unscheduled job from an accepted quote, copying its items and customer text. */
export async function convertQuoteToJob(id: string): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const [{ data: q }, { data: items }, { data: existing }] = await Promise.all([
    ctx.supabase
      .from("quotes")
      .select("customer_id, quote_number, title, customer_message, terms, internal_notes, discount_value, discount_type, discount_amount, tax_value, tax_type, tax_amount, subtotal, total")
      .eq("id", id)
      .maybeSingle(),
    ctx.supabase.from("quote_items").select("description, quantity, unit_price, taxable, position").eq("quote_id", id).order("position"),
    ctx.supabase.from("jobs").select("id").eq("quote_id", id).limit(1),
  ]);
  if (!q) return { error: "Couldn't find this quote." };
  if (existing?.length) return { id: existing[0].id, notice: "This quote already has a job." };

  let job: { id: string } | null = null;
  for (let attempt = 0; attempt < 2 && !job; attempt++) {
    const { data, error } = await ctx.supabase
      .from("jobs")
      .insert({
        customer_id: q.customer_id,
        quote_id: id,
        job_number: await nextJobNumber(ctx.supabase),
        title: q.title || `Job for quote ${q.quote_number}`,
        status: "unscheduled",
        notes: q.customer_message,
        terms: q.terms,
        internal_notes: q.internal_notes,
        discount_value: q.discount_value,
        discount_type: q.discount_type,
        discount_amount: q.discount_amount,
        tax_rate: q.tax_value,
        tax_type: q.tax_type,
        tax_amount: q.tax_amount,
        subtotal: q.subtotal,
        total: q.total,
      })
      .select("id")
      .single();
    if (data) job = data;
    else if (error?.code !== "23505") break;
  }
  if (!job) return { error: "Couldn't create the job. Please try again." };

  if (items?.length) {
    const { error } = await ctx.supabase.from("job_items").insert(items.map((i) => ({ ...i, job_id: job.id })));
    if (error) {
      await ctx.supabase.from("jobs").delete().eq("id", job.id);
      return { error: "Couldn't copy the line items to the job. Please try again." };
    }
  }
  revalidate(id);
  return { id: job.id };
}

/** What the Preview Quote email opens with. */
export async function quoteEmailDraft(id: string): Promise<{ to?: string; subject?: string; message?: string; files?: { name: string; sizeBytes: number | null }[]; error?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const [{ data: q }, { data: files }, profile] = await Promise.all([
    ctx.supabase.from("quotes").select("quote_number, title, customer_message, customers(name, email)").eq("id", id).maybeSingle<{
      quote_number: string;
      title: string | null;
      customer_message: string | null;
      customers: { name: string; email: string | null } | null;
    }>(),
    ctx.supabase.from("quote_attachments").select("name, size_bytes").eq("quote_id", id).eq("internal", false),
    getProfile(ctx.supabase, ctx.userId),
  ]);
  if (!q) return { error: "Couldn't find this quote." };
  const business = profile.legal_business_name || "us";
  const firstName = q.customers?.name.split(/\s+/)[0] ?? "there";
  return {
    to: q.customers?.email ?? "",
    subject: `Your Quote #${q.quote_number} from ${profile.legal_business_name || "Swamped"}`,
    message:
      q.customer_message ??
      `Hi ${firstName},\n\nPlease find your quote${q.title ? ` for ${q.title}` : ""} below. Review the details and terms, and reply to this email to approve it or ask any questions.\n\nThank you,\n${business}`,
    files: (files ?? []).map((f) => ({ name: f.name, sizeBytes: f.size_bytes })),
  };
}

const MAX_EMAIL_ATTACHMENTS_BYTES = 30 * 1024 * 1024;

/** Emails the quote with its public files and marks it sent. */
export async function sendQuote(
  id: string,
  email: { to: string; subject: string; message: string },
): Promise<{ ok?: true; sentTo?: string; error?: string; code?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const to = email.to.trim();
  if (!EMAIL_RE.test(to)) return { error: "Enter a valid email address.", code: "ERR_INVALID_RECIPIENT" };
  if (!clean(email.subject)) return { error: "Enter a subject.", code: "ERR_MISSING_SUBJECT" };

  const [{ data: q }, { data: items }, { data: files }, profile] = await Promise.all([
    ctx.supabase
      .from("quotes")
      .select("quote_number, title, expires_on, terms, subtotal, discount_amount, tax_amount, total, deposit_amount, status, sent_at, customers(name)")
      .eq("id", id)
      .maybeSingle<{
        quote_number: string;
        title: string | null;
        expires_on: string | null;
        terms: string | null;
        subtotal: number;
        discount_amount: number;
        tax_amount: number;
        total: number;
        deposit_amount: number;
        status: string;
        sent_at: string | null;
        customers: { name: string } | null;
      }>(),
    ctx.supabase.from("quote_items").select("description, quantity, unit_price").eq("quote_id", id).order("position"),
    ctx.supabase.from("quote_attachments").select("path, name, size_bytes").eq("quote_id", id).eq("internal", false),
    getProfile(ctx.supabase, ctx.userId),
  ]);
  if (!q) return { error: "Couldn't find this quote.", code: "ERR_QUOTE_NOT_FOUND" };

  // Attach the customer-facing files, within the email size limit.
  const attachments: EmailAttachment[] = [];
  let total = 0;
  for (const f of files ?? []) {
    if (total + (f.size_bytes ?? 0) > MAX_EMAIL_ATTACHMENTS_BYTES) break;
    const { data: blob } = await ctx.supabase.storage.from("attachments").download(f.path);
    if (!blob) continue;
    total += blob.size;
    attachments.push({ filename: f.name, content: Buffer.from(await blob.arrayBuffer()).toString("base64") });
  }

  const expiresOn = q.expires_on ?? new Date().toISOString().slice(0, 10);
  const sent = await sendQuoteEmail({
    to,
    customerName: q.customers?.name ?? "there",
    businessName: profile.legal_business_name || "Your contractor",
    replyTo: profile.business_email || ctx.email,
    quoteNumber: q.quote_number,
    title: q.title,
    expiresOn,
    message: clean(email.message),
    terms: q.terms,
    items: (items ?? []).map((i) => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unit_price) })),
    totals: {
      subtotal: Number(q.subtotal),
      discount: Number(q.discount_amount),
      tax: Number(q.tax_amount),
      total: Number(q.total),
      deposit: Number(q.deposit_amount),
    },
    subject: email.subject.trim().slice(0, 200),
    attachments,
  });
  if (!sent.ok) return { error: `The email wasn't sent: ${sent.reason}`, code: sent.code };

  // Resending an accepted quote doesn't undo the acceptance.
  await ctx.supabase
    .from("quotes")
    .update({ status: q.status === "accepted" ? "accepted" : "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  revalidate(id);
  return { ok: true, sentTo: to };
}

export type DepositInput = { method: string; paidOn: string; reference: string; amount: number; note: string };

/** Records a deposit received outside Swamped; optionally emails the customer a receipt. */
export async function recordDeposit(id: string, input: DepositInput, emailReceipt: boolean): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const fieldErrors: Record<string, string> = {};
  if (!DEPOSIT_METHODS.includes(input.method)) fieldErrors.method = "Choose how the deposit was paid.";
  if (!DATE_RE.test(input.paidOn ?? "")) fieldErrors.paidOn = "Choose the payment date.";
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!(amount > 0)) fieldErrors.amount = "Enter the amount received.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { data: q } = await ctx.supabase
    .from("quotes")
    .select("quote_number, total, status, customers(name, email)")
    .eq("id", id)
    .maybeSingle<{ quote_number: string; total: number; status: string; customers: { name: string; email: string | null } | null }>();
  if (!q) return { error: "Couldn't find this quote." };
  if (amount > Number(q.total)) return { fieldErrors: { amount: "The deposit can't be more than the quote total." } };

  // A paid deposit means the customer has agreed to the quote.
  const { error } = await ctx.supabase
    .from("quotes")
    .update({
      deposit_received_amount: amount,
      deposit_received_at: new Date(`${input.paidOn}T12:00:00Z`).toISOString(),
      deposit_method: input.method,
      deposit_reference: clean(input.reference),
      deposit_note: clean(input.note),
      status: "accepted",
    })
    .eq("id", id);
  if (error) return { error: "Couldn't record the deposit. Please try again." };
  revalidate(id);

  if (!emailReceipt) return { id };
  if (!q.customers?.email) return { id, notice: "Deposit recorded. The customer has no email address, so no receipt was sent." };
  const profile = await getProfile(ctx.supabase, ctx.userId);
  const sent = await sendDepositReceipt({
    to: q.customers.email,
    customerName: q.customers.name,
    businessName: profile.legal_business_name || "Your contractor",
    replyTo: profile.business_email || ctx.email,
    quoteNumber: q.quote_number,
    amount,
    paidOn: new Date(`${input.paidOn}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
    method: input.method,
    reference: clean(input.reference),
    remaining: Math.max(0, Number(q.total) - amount),
  });
  if (!sent.ok) return { id, notice: `Deposit recorded, but the receipt wasn't sent: ${sent.reason}` };
  await ctx.supabase.from("quotes").update({ deposit_receipt_sent_at: new Date().toISOString() }).eq("id", id);
  return { id };
}

export async function addQuoteFiles(id: string, files: UploadedQuoteFile[]): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const error = await attach(ctx.supabase, ctx.userId, id, files);
  if (error) return { error: "Couldn't save the files. Please try again." };
  revalidate(id);
  return { id };
}

export async function deleteQuoteFile(attachmentId: string): Promise<QuoteResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data } = await ctx.supabase
    .from("quote_attachments")
    .delete()
    .eq("id", attachmentId)
    .select("path, quote_id")
    .maybeSingle();
  if (!data) return { error: "Couldn't delete the file. Please try again." };
  await ctx.supabase.storage.from("attachments").remove([data.path]);
  revalidate(data.quote_id);
  return {};
}

/** A short-lived link to view or download one attachment. */
export async function quoteFileUrl(attachmentId: string): Promise<{ url?: string; error?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { data: row } = await ctx.supabase.from("quote_attachments").select("path").eq("id", attachmentId).maybeSingle();
  if (!row) return { error: "File not found." };
  const { data, error } = await ctx.supabase.storage.from("attachments").createSignedUrl(row.path, 60);
  if (error || !data) return { error: "Couldn't open the file. Please try again." };
  return { url: data.signedUrl };
}
