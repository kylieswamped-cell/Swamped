"use server";

import { revalidatePath } from "next/cache";
import { sendPaymentReceipt } from "@/lib/email/invoiceEmail";
import { sendRefundReceipt } from "@/lib/email/paymentEmail";
import { sendDepositReceipt } from "@/lib/email/quoteEmail";
import { PAYMENT_METHODS } from "@/lib/invoices/data";
import { getProfile } from "@/lib/onboarding/server";
import { firstNameOf, profileTemplate, type MergeValues, type TemplateKey } from "@/lib/settings/templates";
import { formatMoney } from "@/lib/quotes/totals";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getPayment, paymentHref, REFUND_METHODS, refundNumber, type PaymentDetail } from "./data";

export type PaymentActionResult = { error?: string; fieldErrors?: Record<string, string>; notice?: string; code?: string };

/** The fields shared by payments and refunds recorded by hand. */
export type LedgerInput = { method: string; date: string; reference: string; amount: number; note: string };

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : null);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const round = (n: number) => Math.round(n * 100) / 100;

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function signedInUser() {
  if (!isSupabaseConfigured) return { error: "Payments aren't available right now." } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email_confirmed_at) return { error: "Your session has expired. Please log in again." } as const;
  return { supabase, userId: data.user.id, email: data.user.email ?? "" } as const;
}

function revalidate(p?: Pick<PaymentDetail, "slug" | "invoice" | "quote" | "job" | "customer">) {
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/quotes");
  revalidatePath("/customers", "layout");
  revalidatePath("/jobs", "layout");
  if (!p) return;
  revalidatePath(`/payments/${p.slug}`);
  if (p.invoice) revalidatePath(`/invoices/${p.invoice.id}`);
  if (p.quote) revalidatePath(`/quotes/${p.quote.id}`);
}

const longDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function validate(input: LedgerInput, methods: string[], what: string) {
  const fieldErrors: Record<string, string> = {};
  if (!methods.includes(input.method)) fieldErrors.method = `Choose how the ${what} was made.`;
  if (!DATE_RE.test(input.date ?? "")) fieldErrors.date = `Choose the ${what} date.`;
  const amount = round(Number(input.amount));
  if (!(amount > 0)) fieldErrors.amount = "Enter an amount more than $0.00.";
  return { fieldErrors, amount };
}

async function sender(ctx: { supabase: Supabase; userId: string; email: string }) {
  const profile = await getProfile(ctx.supabase, ctx.userId);
  const businessName = profile.legal_business_name || "Your contractor";
  return {
    from: { businessName, replyTo: profile.business_email || ctx.email },
    template: (key: TemplateKey, values: MergeValues) =>
      profileTemplate(profile.email_templates, key, { businessName, senderName: profile.contact_name || businessName, ...values }),
  };
}

/** Edits a recorded payment or deposit. */
export async function updatePayment(slug: string, input: LedgerInput): Promise<PaymentActionResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const p = await getPayment(ctx.supabase, slug);
  if (!p) return { error: "Couldn't find this payment." };

  const { fieldErrors, amount } = validate(input, PAYMENT_METHODS, "payment");
  if (!fieldErrors.amount && amount > p.maxAmount) {
    fieldErrors.amount = `The payment can't be more than ${p.kind === "deposit" ? "the quote total" : "the invoice balance"} (${p.maxAmount.toLocaleString("en-US", { style: "currency", currency: "USD" })}).`;
  }
  if (!fieldErrors.amount && amount < p.refunded) fieldErrors.amount = "The payment can't be less than what has been refunded.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { error } =
    p.kind === "payment"
      ? await ctx.supabase
          .from("invoice_payments")
          .update({ amount, paid_on: input.date, method: input.method, reference: clean(input.reference), note: clean(input.note) })
          .eq("id", p.id)
      : await ctx.supabase
          .from("quotes")
          .update({
            deposit_received_amount: amount,
            deposit_received_at: new Date(`${input.date}T12:00:00Z`).toISOString(),
            deposit_method: input.method,
            deposit_reference: clean(input.reference),
            deposit_note: clean(input.note),
          })
          .eq("id", p.id);
  if (error) return { error: "Couldn't save the payment. Please try again." };
  revalidate(p);
  return {};
}

/** Removes a recorded payment (and its refunds); the invoice or quote balance follows. */
export async function deletePayment(slug: string): Promise<PaymentActionResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const p = await getPayment(ctx.supabase, slug);
  if (!p) return { error: "Couldn't find this payment." };

  if (p.kind === "payment") {
    const { error } = await ctx.supabase.from("invoice_payments").delete().eq("id", p.id);
    if (error) return { error: "Couldn't delete the payment. Please try again." };
  } else {
    await ctx.supabase.from("payment_refunds").delete().eq("quote_id", p.id);
    const { error } = await ctx.supabase
      .from("quotes")
      .update({ deposit_received_amount: 0, deposit_received_at: null, deposit_method: null, deposit_reference: null, deposit_note: null })
      .eq("id", p.id);
    if (error) return { error: "Couldn't delete the deposit. Please try again." };
  }
  revalidate(p);
  return {};
}

/** Emails the customer a receipt for a recorded payment or deposit. */
export async function sendReceipt(slug: string): Promise<PaymentActionResult & { sentTo?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const p = await getPayment(ctx.supabase, slug);
  if (!p) return { error: "Couldn't find this payment." };
  if (!p.customer?.email) return { error: "This customer has no email address. Add one on their profile first." };

  const { from, template } = await sender(ctx);
  const merge = {
    customerFirstName: firstNameOf(p.customer.name),
    customerName: p.customer.name,
    paymentAmount: formatMoney(p.amount),
    paymentDate: longDate(p.paidOn),
    transactionId: p.reference ?? p.number,
  };
  const common = {
    to: p.customer.email,
    customerName: p.customer.name,
    ...from,
    amount: p.amount,
    paidOn: longDate(p.paidOn),
    method: p.method,
    reference: p.reference,
  };
  const sent =
    p.kind === "payment"
      ? await sendPaymentReceipt({
          ...common,
          invoiceNumber: p.invoice?.number ?? "",
          remaining: p.invoice?.balance ?? 0,
          template: template("invoice_receipt", { ...merge, invoiceNumber: p.invoice?.number ?? "" }),
        })
      : await sendDepositReceipt({
          ...common,
          quoteNumber: p.quote?.number ?? "",
          remaining: Math.max(0, round((p.quote?.total ?? 0) - p.amount)),
          template: template("deposit", { ...merge, quoteNumber: p.quote?.number ?? "" }),
        });
  if (!sent.ok) return { error: `The receipt wasn't sent: ${sent.reason}`, code: sent.code };

  const now = new Date().toISOString();
  if (p.kind === "payment") await ctx.supabase.from("invoice_payments").update({ receipt_sent_at: now }).eq("id", p.id);
  else await ctx.supabase.from("quotes").update({ deposit_receipt_sent_at: now }).eq("id", p.id);
  revalidate(p);
  return { sentTo: p.customer.email };
}

/** Sends a receipt from the transaction log, for a payment, deposit, or refund. */
export async function resendReceipt(kind: "payment" | "deposit" | "refund", id: string): Promise<PaymentActionResult & { sentTo?: string }> {
  if (!UUID_RE.test(id)) return { error: "Couldn't find this transaction." };
  if (kind === "refund") return sendRefundReceiptEmail(id);
  return sendReceipt(paymentHref(kind, id).slice("/payments/".length));
}

/** The payment a refund belongs to, for checks and receipts. */
async function refundOwner(supabase: Supabase, refundId: string) {
  if (!UUID_RE.test(refundId)) return null;
  const { data } = await supabase.from("payment_refunds").select("id, payment_id, quote_id, amount").eq("id", refundId).maybeSingle();
  if (!data) return null;
  const slug = data.payment_id ? data.payment_id : `deposit-${data.quote_id}`;
  const payment = await getPayment(supabase, slug);
  return payment ? { payment, amount: Number(data.amount) } : null;
}

/** Records money returned to the customer by hand; optionally emails them a receipt. */
export async function recordRefund(
  slug: string,
  input: LedgerInput,
  emailReceipt: boolean,
): Promise<PaymentActionResult & { refundId?: string; number?: string; recordedAt?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const p = await getPayment(ctx.supabase, slug);
  if (!p) return { error: "Couldn't find this payment.", code: "ERR_PAYMENT_NOT_FOUND" };

  const { fieldErrors, amount } = validate(input, REFUND_METHODS, "refund");
  if (!fieldErrors.amount && amount > p.net) fieldErrors.amount = `The refund can't be more than ${p.net.toLocaleString("en-US", { style: "currency", currency: "USD" })} still held on this payment.`;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { data: refund, error } = await ctx.supabase
    .from("payment_refunds")
    .insert({
      payment_id: p.kind === "payment" ? p.id : null,
      quote_id: p.kind === "deposit" ? p.id : null,
      amount,
      refunded_on: input.date,
      method: input.method,
      reference: clean(input.reference),
      note: clean(input.note),
    })
    .select("id, refund_number, created_at")
    .single();
  if (error || !refund) return { error: "We couldn't save this refund record. Please try again later.", code: "ERR_REFUND_NOT_SAVED" };
  revalidate(p);

  const done = { refundId: refund.id, number: refundNumber(refund.refund_number), recordedAt: refund.created_at };
  if (!emailReceipt) return done;
  const sent = await sendRefundReceiptEmail(refund.id);
  return sent.error ? { ...done, notice: `Refund recorded, but the receipt wasn't sent: ${sent.error.replace(/^The receipt wasn't sent: /, "")}` } : done;
}

export async function updateRefund(refundId: string, input: LedgerInput): Promise<PaymentActionResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const owner = await refundOwner(ctx.supabase, refundId);
  if (!owner) return { error: "Couldn't find this refund." };

  const { fieldErrors, amount } = validate(input, REFUND_METHODS, "refund");
  const room = round(owner.payment.net + owner.amount);
  if (!fieldErrors.amount && amount > room) fieldErrors.amount = `The refund can't be more than ${room.toLocaleString("en-US", { style: "currency", currency: "USD" })}.`;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { error } = await ctx.supabase
    .from("payment_refunds")
    .update({ amount, refunded_on: input.date, method: input.method, reference: clean(input.reference), note: clean(input.note) })
    .eq("id", refundId);
  if (error) return { error: "Couldn't save the refund. Please try again." };
  revalidate(owner.payment);
  return {};
}

export async function deleteRefund(refundId: string): Promise<PaymentActionResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const owner = await refundOwner(ctx.supabase, refundId);
  if (!owner) return { error: "Couldn't find this refund." };
  const { error } = await ctx.supabase.from("payment_refunds").delete().eq("id", refundId);
  if (error) return { error: "Couldn't delete the refund. Please try again." };
  revalidate(owner.payment);
  return {};
}

export async function sendRefundReceiptEmail(refundId: string): Promise<PaymentActionResult & { sentTo?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const owner = await refundOwner(ctx.supabase, refundId);
  if (!owner) return { error: "Couldn't find this refund." };
  const p = owner.payment;
  const refund = p.refunds.find((r) => r.id === refundId);
  if (!refund) return { error: "Couldn't find this refund." };
  if (!p.customer?.email) return { error: "This customer has no email address. Add one on their profile first." };

  const { from, template } = await sender(ctx);
  const sent = await sendRefundReceipt({
    to: p.customer.email,
    customerName: p.customer.name,
    ...from,
    template: template("refund", {
      customerFirstName: firstNameOf(p.customer.name),
      customerName: p.customer.name,
      refundAmount: formatMoney(refund.amount),
      originalPaymentAmount: formatMoney(p.amount),
    }),
    refundNumber: refund.number,
    regarding: p.kind === "payment" ? `Invoice ${p.invoice?.number ?? ""}`.trim() : `Deposit on quote ${p.quote?.number ?? ""}`.trim(),
    amount: refund.amount,
    refundedOn: longDate(refund.refundedOn),
    method: refund.method,
    reference: refund.reference,
  });
  if (!sent.ok) return { error: `The receipt wasn't sent: ${sent.reason}`, code: sent.code };
  await ctx.supabase.from("payment_refunds").update({ receipt_sent_at: new Date().toISOString() }).eq("id", refundId);
  revalidate(p);
  return { sentTo: p.customer.email };
}
