"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getProfile } from "@/lib/onboarding/server";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  DAYS,
  COMMUNICATIONS,
  NOTIFICATIONS,
  PAYOUT_SCHEDULES,
  TIME_RE,
  TIME_ZONES,
  type OperatingHours,
} from "./options";
import { TEMPLATE_KEYS, type EmailTemplate, type TemplateKey } from "./templates";

export type SettingsResult = { error?: string; fieldErrors?: Record<string, string>; notice?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAVE_FAILED = "Couldn't save your settings. Please try again.";

const clean = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

async function signedInUser() {
  if (!isSupabaseConfigured) return { error: "Settings aren't available right now." } as const;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email_confirmed_at) return { error: "Your session has expired. Please log in again." } as const;
  return { supabase, user: data.user, userId: data.user.id } as const;
}

async function update(fields: Record<string, unknown>, notice = "Changes saved."): Promise<SettingsResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  const { error } = await ctx.supabase.from("profiles").update(fields).eq("id", ctx.userId);
  if (error) {
    console.error("Settings update failed", error);
    return { error: SAVE_FAILED };
  }
  // Defaults feed new quotes, invoices and jobs, so refresh the whole app.
  revalidatePath("/", "layout");
  return { notice };
}

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Personal information ------------------------------------------------------------

export async function savePersonalInfo(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<SettingsResult> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };

  const fieldErrors: Record<string, string> = {};
  const email = clean(input.email, 254)?.toLowerCase() ?? null;
  if (!email) fieldErrors.email = "Enter your email address.";
  else if (!EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";

  const changingPassword = Boolean(input.currentPassword || input.newPassword || input.confirmPassword);
  if (changingPassword) {
    if (!input.currentPassword) fieldErrors.currentPassword = "Enter your current password.";
    if (input.newPassword.length < 8) fieldErrors.newPassword = "Password must be at least 8 characters.";
    else if (input.newPassword === input.currentPassword) fieldErrors.newPassword = "Choose a password you haven't used here.";
    if (input.confirmPassword !== input.newPassword) fieldErrors.confirmPassword = "Passwords don't match.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  if (changingPassword) {
    // Check the current password without touching this browser's session.
    const verifier = createStatelessClient(supabaseUrl!, supabaseKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await verifier.auth.signInWithPassword({ email: ctx.user.email ?? "", password: input.currentPassword });
    if (error) {
      return /rate limit|too many/i.test(error.message)
        ? { error: "Too many attempts. Please wait a moment and try again." }
        : { fieldErrors: { currentPassword: "That password isn't right." } };
    }
  }

  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      first_name: clean(input.firstName, 100),
      last_name: clean(input.lastName, 100),
      personal_phone: clean(input.phone, 40),
    })
    .eq("id", ctx.userId);
  if (error) return { error: SAVE_FAILED };

  const notices = ["Changes saved."];
  if (changingPassword) {
    const { error: pwError } = await ctx.supabase.auth.updateUser({ password: input.newPassword });
    if (pwError) return { error: `Your details were saved, but the password wasn't changed: ${pwError.message}` };
    notices.push("Your password has been updated.");
  }
  if (email !== ctx.user.email?.toLowerCase()) {
    const { error: emailError } = await ctx.supabase.auth.updateUser(
      { email: email! },
      { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/settings` },
    );
    if (emailError) {
      return /already|exists|registered/i.test(emailError.message)
        ? { fieldErrors: { email: "Another account already uses this email." } }
        : { error: `Your details were saved, but the email wasn't changed: ${emailError.message}` };
    }
    notices.push(`Check ${email} for a link to confirm your new email address.`);
  }

  revalidatePath("/", "layout");
  return { notice: notices.join(" ") };
}

// Photos (avatar and business logo) ---------------------------------------------------

/**
 * Points the avatar or logo at a file the browser just uploaded (or clears it)
 * and removes the file it replaces.
 */
export async function setProfileImage(kind: "avatar" | "logo", path: string | null): Promise<SettingsResult & { url?: string }> {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error };
  if (path !== null && !path.startsWith(`${ctx.userId}/settings/`)) return { error: "That upload couldn't be found." };

  const column = kind === "avatar" ? "avatar_path" : "logo_path";
  const profile = await getProfile(ctx.supabase, ctx.userId);
  const previous = profile[column];

  const { error } = await ctx.supabase.from("profiles").update({ [column]: path }).eq("id", ctx.userId);
  if (error) return { error: SAVE_FAILED };
  if (previous && previous !== path) await ctx.supabase.storage.from("attachments").remove([previous]);

  revalidatePath("/", "layout");
  if (!path) return { notice: kind === "avatar" ? "Photo removed." : "Logo removed." };
  const { data } = await ctx.supabase.storage.from("attachments").createSignedUrl(path, 60 * 60);
  return { notice: kind === "avatar" ? "Photo updated." : "Logo updated.", url: data?.signedUrl };
}

// Business profile ----------------------------------------------------------------

export async function saveBusinessProfile(input: {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  showContact: boolean;
  showWebsite: boolean;
  showAddress: boolean;
}): Promise<SettingsResult> {
  const fieldErrors: Record<string, string> = {};
  if (!clean(input.businessName)) fieldErrors.businessName = "Enter your business name.";
  const email = clean(input.email, 254);
  if (email && !EMAIL_RE.test(email)) fieldErrors.email = "Enter a valid email address.";
  const website = clean(input.website, 200)?.replace(/^https?:\/\//i, "") ?? null;
  if (website && !/^[^\s/]+\.[^\s]+$/.test(website)) fieldErrors.website = "Enter a website like example.com.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  return update({
    legal_business_name: clean(input.businessName, 200),
    contact_name: clean(input.contactName, 200),
    business_phone: clean(input.phone, 40),
    business_email: email,
    website_url: website ? `https://${website}` : null,
    // The address is one free-form block now; the onboarding parts are folded into it.
    street_address: clean(input.address, 1000),
    city: null,
    state: null,
    zip_code: null,
    show_contact_on_docs: Boolean(input.showContact),
    show_website_on_docs: Boolean(input.showWebsite),
    show_address_on_docs: Boolean(input.showAddress),
  });
}

// Operating hours -----------------------------------------------------------------

export async function saveOperatingHours(input: {
  timeZone: string;
  showOnDocs: boolean;
  hours: OperatingHours;
}): Promise<SettingsResult> {
  if (!TIME_ZONES.some((z) => z.value === input.timeZone)) return { error: "Choose a time zone." };
  const hours = {} as OperatingHours;
  const fieldErrors: Record<string, string> = {};
  for (const { key, label } of DAYS) {
    const d = input.hours?.[key];
    if (!d || !TIME_RE.test(d.from) || !TIME_RE.test(d.to)) {
      fieldErrors[key] = `Enter valid hours for ${label}.`;
      continue;
    }
    if (d.open && d.from >= d.to) fieldErrors[key] = `${label} must close after it opens.`;
    hours[key] = { open: Boolean(d.open), from: d.from, to: d.to };
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return update({ time_zone: input.timeZone, show_hours_on_docs: Boolean(input.showOnDocs), operating_hours: hours });
}

// Tax ---------------------------------------------------------------------------------

export async function saveTaxSettings(input: { taxRate: number; taxRates: number[] }): Promise<SettingsResult> {
  const rate = round(Number(input.taxRate), 3);
  if (!(rate >= 0 && rate <= 100)) return { fieldErrors: { taxRate: "Enter a rate between 0 and 100." } };
  const rates = [...new Set((input.taxRates ?? []).map((r) => round(Number(r), 3)))]
    .filter((r) => r >= 0 && r <= 100)
    .sort((a, b) => a - b)
    .slice(0, 20);
  return update({ tax_rate: rate, tax_rates: rates });
}

// Email templates ---------------------------------------------------------------------

function validTemplates(input: Partial<Record<TemplateKey, EmailTemplate>>) {
  const templates: Partial<Record<TemplateKey, EmailTemplate>> = {};
  const fieldErrors: Record<string, string> = {};
  for (const key of TEMPLATE_KEYS) {
    const t = input[key];
    if (!t) continue;
    const subject = clean(t.subject, 200);
    const body = typeof t.body === "string" ? t.body.trim().slice(0, 5000) : "";
    if (!subject) fieldErrors[`${key}.subject`] = "Enter a subject line.";
    if (!body) fieldErrors[`${key}.body`] = "Enter the email text.";
    if (subject && body) templates[key] = { subject, body };
  }
  return { templates, fieldErrors };
}

async function mergedTemplates(templates: Partial<Record<TemplateKey, EmailTemplate>>) {
  const ctx = await signedInUser();
  if ("error" in ctx) return { error: ctx.error } as const;
  const profile = await getProfile(ctx.supabase, ctx.userId);
  const saved = profile.email_templates && typeof profile.email_templates === "object" ? profile.email_templates : {};
  return { value: { ...saved, ...templates } } as const;
}

/** Saves a single template (the template card's own Save button). */
export async function saveEmailTemplate(key: TemplateKey, template: EmailTemplate): Promise<SettingsResult> {
  if (!TEMPLATE_KEYS.includes(key)) return { error: "Unknown template." };
  const { templates, fieldErrors } = validTemplates({ [key]: template });
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const merged = await mergedTemplates(templates);
  if ("error" in merged) return { error: merged.error };
  return update({ email_templates: merged.value }, "Template saved.");
}

// Quote configuration -----------------------------------------------------------------

export async function saveQuoteConfig(input: {
  depositRequired: boolean;
  depositType: "percent" | "fixed";
  depositValue: number;
  quoteTerms: string;
  reminderEnabled: boolean;
  reminderDays: number;
  templates: Partial<Record<TemplateKey, EmailTemplate>>;
}): Promise<SettingsResult> {
  const fieldErrors: Record<string, string> = {};
  const depositType = input.depositType === "fixed" ? "fixed" : "percent";
  const deposit = input.depositRequired ? round(Number(input.depositValue)) : 0;
  if (input.depositRequired && (!(deposit > 0) || (depositType === "percent" && deposit > 100))) {
    fieldErrors.depositValue = depositType === "percent" ? "Enter 1–100%." : "Enter an amount more than $0.";
  }
  const reminderDays = Number(input.reminderDays);
  if (!Number.isInteger(reminderDays) || reminderDays < 1 || reminderDays > 30) fieldErrors.reminderDays = "Choose when to send the reminder.";
  const t = validTemplates(input.templates ?? {});
  Object.assign(fieldErrors, t.fieldErrors);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const merged = await mergedTemplates(t.templates);
  if ("error" in merged) return { error: merged.error };
  return update({
    deposit_value: deposit,
    deposit_type: depositType,
    quote_terms: clean(input.quoteTerms, 5000),
    quote_reminder_enabled: Boolean(input.reminderEnabled),
    quote_reminder_days: reminderDays,
    email_templates: merged.value,
  });
}

// Invoice configuration ---------------------------------------------------------------

export async function saveInvoiceConfig(input: {
  dueDays: number;
  invoiceTerms: string;
  reminderEnabled: boolean;
  reminderDays: number;
  pastDueNotice: boolean;
  pastDueReminder: boolean;
  pastDueReminderDays: number;
  templates: Partial<Record<TemplateKey, EmailTemplate>>;
}): Promise<SettingsResult> {
  const fieldErrors: Record<string, string> = {};
  const dueDays = Number(input.dueDays);
  if (!Number.isInteger(dueDays) || dueDays < 1 || dueDays > 365) fieldErrors.dueDays = "Choose a default due date.";
  const reminderDays = Number(input.reminderDays);
  if (!Number.isInteger(reminderDays) || reminderDays < 1 || reminderDays > 30) fieldErrors.reminderDays = "Choose when to send the reminder.";
  const pastDueDays = Number(input.pastDueReminderDays);
  if (!Number.isInteger(pastDueDays) || pastDueDays < 1 || pastDueDays > 90) fieldErrors.pastDueReminderDays = "Choose when to send the reminder.";
  const t = validTemplates(input.templates ?? {});
  Object.assign(fieldErrors, t.fieldErrors);
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const merged = await mergedTemplates(t.templates);
  if ("error" in merged) return { error: merged.error };
  return update({
    invoice_due_days: dueDays,
    invoice_terms: clean(input.invoiceTerms, 5000),
    invoice_reminder_enabled: Boolean(input.reminderEnabled),
    invoice_reminder_days: reminderDays,
    past_due_notice_enabled: Boolean(input.pastDueNotice),
    past_due_reminder_enabled: Boolean(input.pastDueReminder),
    past_due_reminder_days: pastDueDays,
    email_templates: merged.value,
  });
}

// Notifications, communication and payouts ---------------------------------------------

function prefs(keys: readonly { key: string }[], input: Record<string, boolean>) {
  return Object.fromEntries(keys.map(({ key }) => [key, input?.[key] !== false]));
}

export async function saveNotificationPrefs(input: Record<string, boolean>): Promise<SettingsResult> {
  return update({ notification_prefs: prefs(NOTIFICATIONS, input) });
}

export async function saveCommunicationPrefs(input: Record<string, boolean>): Promise<SettingsResult> {
  return update({ communication_prefs: prefs(COMMUNICATIONS, input) });
}

export async function savePayoutSettings(input: { schedule: string; minimum: number }): Promise<SettingsResult> {
  if (!PAYOUT_SCHEDULES.some((s) => s.value === input.schedule)) return { fieldErrors: { schedule: "Choose a payout schedule." } };
  const minimum = round(Number(input.minimum));
  if (!(minimum >= 0) || minimum > 1_000_000) return { fieldErrors: { minimum: "Enter an amount of 0 or more." } };
  return update({ payout_schedule: input.schedule, payout_minimum: minimum });
}
