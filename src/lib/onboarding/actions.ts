"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendQuoteEmail } from "@/lib/email/quoteEmail";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { quoteTotals, type AmountType } from "@/lib/quotes/totals";
import { getProfile, type Profile } from "./server";
import { nextStep, type OnboardingStep } from "./steps";

export type StepResult = { error?: string; fieldErrors?: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function toNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

const amountType = (v: unknown): AmountType => (v === "fixed" ? "fixed" : "percent");

/**
 * Loads the signed-in, verified user and checks they're on `expected` —
 * the server decides the order, so a stale tab can't skip or repeat steps.
 */
async function forStep(expected: OnboardingStep): Promise<
  | { error: string }
  | { supabase: SupabaseClient; userId: string; email: string; profile: Profile }
> {
  if (!isSupabaseConfigured) return { error: "Onboarding isn't available right now." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email_confirmed_at) return { error: "Your session has expired. Please log in again." };
  const profile = await getProfile(supabase, data.user.id);
  if (profile.onboarding_step !== expected) {
    return { error: "This step is already done. Refresh the page to continue where you left off." };
  }
  return { supabase, userId: data.user.id, email: data.user.email ?? "", profile };
}

async function advance(
  supabase: SupabaseClient,
  userId: string,
  from: OnboardingStep,
  fields: Record<string, unknown> = {},
): Promise<StepResult> {
  const step = nextStep(from);
  const { error } = await supabase
    .from("profiles")
    .update({
      ...fields,
      onboarding_step: step,
      ...(step === "complete" ? { onboarding_completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", userId);
  return error ? { error: "Couldn't save your progress. Please try again." } : {};
}

// Step 1 · Part 1 -------------------------------------------------------------

export async function saveBusinessDetails(input: Record<string, string>): Promise<StepResult> {
  const ctx = await forStep("business-details");
  if ("error" in ctx) return ctx;

  const fieldErrors: Record<string, string> = {};
  if (!clean(input.legalBusinessName)) fieldErrors.legalBusinessName = "Enter your legal business name.";
  const email = clean(input.businessEmail);
  if (!email) fieldErrors.businessEmail = "Enter your business email.";
  else if (!EMAIL_RE.test(email)) fieldErrors.businessEmail = "Enter a valid email address.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  return advance(ctx.supabase, ctx.userId, "business-details", {
    legal_business_name: clean(input.legalBusinessName),
    contact_name: clean(input.contactName),
    business_email: email,
    business_phone: clean(input.businessPhone),
    website_url: clean(input.websiteUrl),
    street_address: clean(input.streetAddress),
    city: clean(input.city),
    state: clean(input.state),
    zip_code: clean(input.zipCode),
  });
}

// Step 1 · Part 2 -------------------------------------------------------------

export async function saveBusinessAbout(input: Record<string, string>): Promise<StepResult> {
  const ctx = await forStep("business-about");
  if ("error" in ctx) return ctx;

  const years = clean(input.yearsInBusiness);
  if (years !== null && (!/^\d+$/.test(years) || Number(years) > 200)) {
    return { fieldErrors: { yearsInBusiness: "Enter a whole number of years." } };
  }

  return advance(ctx.supabase, ctx.userId, "business-about", {
    industry: clean(input.industry),
    years_in_business: years === null ? null : Number(years),
    employee_range: clean(input.employeeRange),
    revenue_range: clean(input.revenueRange),
  });
}

// Step 1 · Part 3 (skippable) -------------------------------------------------

export async function saveBusinessDefaults(
  input: Record<string, string> | null,
): Promise<StepResult> {
  const ctx = await forStep("business-defaults");
  if ("error" in ctx) return ctx;
  // "Skip for Now" keeps the database defaults.
  if (!input) return advance(ctx.supabase, ctx.userId, "business-defaults");

  const fieldErrors: Record<string, string> = {};
  const expiration = toNumber(input.quoteExpirationDays, NaN);
  if (!Number.isInteger(expiration) || expiration < 1) fieldErrors.quoteExpirationDays = "Enter at least 1 day.";
  const due = toNumber(input.invoiceDueDays, NaN);
  if (!Number.isInteger(due) || due < 1) fieldErrors.invoiceDueDays = "Enter at least 1 day.";
  const deposit = toNumber(input.depositValue, NaN);
  const depositType = amountType(input.depositType);
  if (!(deposit >= 0) || (depositType === "percent" && deposit > 100)) {
    fieldErrors.depositValue = depositType === "percent" ? "Enter 0–100%." : "Enter an amount of 0 or more.";
  }
  const tax = toNumber(input.taxRate, NaN);
  if (!(tax >= 0 && tax <= 100)) fieldErrors.taxRate = "Enter a rate between 0 and 100.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  return advance(ctx.supabase, ctx.userId, "business-defaults", {
    quote_expiration_days: expiration,
    deposit_value: deposit,
    deposit_type: depositType,
    quote_terms: clean(input.quoteTerms),
    invoice_due_days: due,
    invoice_terms: clean(input.invoiceTerms),
    tax_rate: tax,
  });
}

// Step 2 ------------------------------------------------------------------------

/** Stripe Connect isn't wired up yet: this only moves onboarding forward. */
export async function continueFromStripe(): Promise<StepResult> {
  const ctx = await forStep("stripe");
  if ("error" in ctx) return ctx;
  return advance(ctx.supabase, ctx.userId, "stripe");
}

// Step 3 ------------------------------------------------------------------------

/** Uploaded files must sit in the user's own folder (storage policies enforce it too). */
function ownPath(path: unknown, userId: string) {
  return typeof path === "string" && path.startsWith(`${userId}/`) && !path.includes("..") ? path : null;
}

export async function createFirstCustomer(
  input: Record<string, string>,
): Promise<StepResult & { customer?: { id: string; name: string; email: string | null } }> {
  const ctx = await forStep("customer");
  if ("error" in ctx) return ctx;

  const fieldErrors: Record<string, string> = {};
  const name = clean(input.name);
  if (!name) fieldErrors.name = "Enter the customer's name.";
  const email = clean(input.email);
  if (email && !EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { data, error } = await ctx.supabase
    .from("customers")
    .insert({
      name,
      email,
      phone: clean(input.phone),
      street_address: clean(input.streetAddress),
      notes: clean(input.notes),
      attachment_path: ownPath(input.attachmentPath, ctx.userId),
    })
    .select("id, name, email")
    .single();
  if (error) return { error: "Couldn't create the customer. Please try again." };

  const result = await advance(ctx.supabase, ctx.userId, "customer");
  return result.error ? result : { customer: data };
}

// Step 4 (last) -------------------------------------------------------------------

export type QuoteInput = {
  customerId: string;
  title: string;
  items: { description: string; quantity: number; unitPrice: number; taxable: boolean }[];
  discountValue: number;
  discountType: AmountType;
  taxValue: number;
  taxType: AmountType;
  depositValue: number;
  depositType: AmountType;
  customerMessage: string;
  terms: string;
  internalNotes: string;
  attachmentPath: string | null;
};

export async function createFirstQuote(
  input: QuoteInput,
): Promise<StepResult & { emailSent?: boolean; emailNote?: string }> {
  const ctx = await forStep("quote");
  if ("error" in ctx) return ctx;
  const { supabase, userId, profile } = ctx;

  const items = (input.items ?? [])
    .map((item, position) => ({
      position,
      description: String(item.description ?? "").trim(),
      quantity: toNumber(item.quantity),
      unit_price: toNumber(item.unitPrice),
      taxable: Boolean(item.taxable),
    }))
    .filter((item) => item.description);

  const fieldErrors: Record<string, string> = {};
  if (!input.customerId) fieldErrors.customerId = "Select a customer.";
  if (!items.length) fieldErrors.items = "Add at least one line item with a description.";
  else if (items.some((i) => i.quantity <= 0 || i.unit_price < 0)) {
    fieldErrors.items = "Each line item needs a quantity above 0 and a price of 0 or more.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  // Re-read the customer through RLS: the client only sends its id.
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, email")
    .eq("id", input.customerId)
    .maybeSingle();
  if (!customer) return { fieldErrors: { customerId: "Select one of your customers." } };

  const adjustments = {
    discountValue: toNumber(input.discountValue),
    discountType: amountType(input.discountType),
    taxValue: toNumber(input.taxValue),
    taxType: amountType(input.taxType),
    depositValue: toNumber(input.depositValue),
    depositType: amountType(input.depositType),
  };
  const totals = quoteTotals(
    items.map((i) => ({ quantity: i.quantity, unitPrice: i.unit_price, taxable: i.taxable })),
    adjustments,
  );

  const { count } = await supabase.from("quotes").select("id", { count: "exact", head: true });
  const quoteNumber = `Q-${1001 + (count ?? 0)}`;
  const today = new Date();
  const expires = new Date(today);
  expires.setDate(expires.getDate() + profile.quote_expiration_days);
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      customer_id: customer.id,
      quote_number: quoteNumber,
      title: clean(input.title),
      quote_date: isoDate(today),
      expires_on: isoDate(expires),
      customer_message: clean(input.customerMessage),
      terms: clean(input.terms),
      internal_notes: clean(input.internalNotes),
      attachment_path: ownPath(input.attachmentPath, userId),
      discount_value: adjustments.discountValue,
      discount_type: adjustments.discountType,
      tax_value: adjustments.taxValue,
      tax_type: adjustments.taxType,
      deposit_value: adjustments.depositValue,
      deposit_type: adjustments.depositType,
      subtotal: totals.subtotal,
      discount_amount: totals.discount,
      tax_amount: totals.tax,
      total: totals.total,
      deposit_amount: totals.deposit,
    })
    .select("id")
    .single();
  if (error || !quote) return { error: "Couldn't save the quote. Please try again." };

  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(items.map((item) => ({ ...item, quote_id: quote.id })));
  if (itemsError) {
    await supabase.from("quotes").delete().eq("id", quote.id);
    return { error: "Couldn't save the quote items. Please try again." };
  }

  // The quote is saved, so onboarding is done whether or not the email goes out.
  const done = await advance(supabase, userId, "quote");
  if (done.error) return done;

  if (!customer.email) {
    return { emailSent: false, emailNote: "Quote saved. The customer has no email address, so it wasn't sent." };
  }
  const sent = await sendQuoteEmail({
    to: customer.email,
    customerName: customer.name,
    businessName: profile.legal_business_name || "Your contractor",
    replyTo: profile.business_email || ctx.email,
    quoteNumber,
    title: clean(input.title),
    expiresOn: isoDate(expires),
    message: clean(input.customerMessage),
    terms: clean(input.terms),
    items: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unit_price })),
    totals,
  });
  if (!sent.ok) return { emailSent: false, emailNote: `Quote saved, but the email wasn't sent: ${sent.reason}` };

  await supabase.from("quotes").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", quote.id);
  return { emailSent: true };
}
