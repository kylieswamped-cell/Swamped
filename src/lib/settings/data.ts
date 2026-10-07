import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/onboarding/server";
import {
  COMMUNICATIONS,
  NOTIFICATIONS,
  PAYOUT_SCHEDULES,
  TIME_ZONES,
  resolveHours,
  resolvePrefs,
  type OperatingHours,
  type PayoutSchedule,
} from "./options";
import { resolveTemplates, type EmailTemplates } from "./templates";

export type SettingsData = {
  personal: { firstName: string; lastName: string; email: string; phone: string; avatarUrl: string | null };
  business: {
    businessName: string;
    contactName: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    showContact: boolean;
    showWebsite: boolean;
    showAddress: boolean;
    logoUrl: string | null;
  };
  hours: { timeZone: string; showOnDocs: boolean; hours: OperatingHours };
  tax: { taxRate: number; taxRates: number[] };
  quote: {
    depositRequired: boolean;
    depositType: "percent" | "fixed";
    depositValue: number;
    quoteTerms: string;
    reminderEnabled: boolean;
    reminderDays: number;
  };
  invoice: {
    dueDays: number;
    invoiceTerms: string;
    reminderEnabled: boolean;
    reminderDays: number;
    pastDueNotice: boolean;
    pastDueReminder: boolean;
    pastDueReminderDays: number;
  };
  templates: EmailTemplates;
  notifications: Record<string, boolean>;
  communications: Record<string, boolean>;
  stripe: { connected: boolean; connectedAt: string | null; schedule: PayoutSchedule; minimum: number };
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const bool = (v: unknown, fallback = true) => (typeof v === "boolean" ? v : fallback);

async function signedUrl(supabase: SupabaseClient, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await supabase.storage.from("attachments").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function loadSettings(supabase: SupabaseClient, user: User, p: Profile): Promise<SettingsData> {
  const [avatarUrl, logoUrl] = await Promise.all([signedUrl(supabase, p.avatar_path), signedUrl(supabase, p.logo_path)]);

  // Older profiles have the first/last name only in the sign-up contact name.
  const [first = "", ...rest] = str(p.contact_name).trim().split(/\s+/);
  const address = [p.street_address, [p.city, p.state].filter(Boolean).join(", "), p.zip_code]
    .filter((part) => part && String(part).trim())
    .join(", ");

  return {
    personal: {
      firstName: p.first_name ?? first,
      lastName: p.last_name ?? rest.join(" "),
      email: user.email ?? "",
      phone: str(p.personal_phone),
      avatarUrl,
    },
    business: {
      businessName: str(p.legal_business_name),
      contactName: str(p.contact_name),
      phone: str(p.business_phone),
      email: str(p.business_email),
      website: str(p.website_url).replace(/^https?:\/\//i, ""),
      address,
      showContact: bool(p.show_contact_on_docs),
      showWebsite: bool(p.show_website_on_docs),
      showAddress: bool(p.show_address_on_docs),
      logoUrl,
    },
    hours: {
      timeZone: TIME_ZONES.some((z) => z.value === p.time_zone) ? p.time_zone : "America/New_York",
      showOnDocs: bool(p.show_hours_on_docs),
      hours: resolveHours(p.operating_hours),
    },
    tax: {
      taxRate: Number(p.tax_rate) || 0,
      taxRates: (p.tax_rates ?? []).map(Number),
    },
    quote: {
      depositRequired: Number(p.deposit_value) > 0,
      depositType: p.deposit_type === "fixed" ? "fixed" : "percent",
      depositValue: Number(p.deposit_value) || 0,
      quoteTerms: str(p.quote_terms),
      reminderEnabled: bool(p.quote_reminder_enabled),
      reminderDays: p.quote_reminder_days ?? 3,
    },
    invoice: {
      dueDays: p.invoice_due_days ?? 14,
      invoiceTerms: str(p.invoice_terms),
      reminderEnabled: bool(p.invoice_reminder_enabled),
      reminderDays: p.invoice_reminder_days ?? 3,
      pastDueNotice: bool(p.past_due_notice_enabled),
      pastDueReminder: bool(p.past_due_reminder_enabled),
      pastDueReminderDays: p.past_due_reminder_days ?? 7,
    },
    templates: resolveTemplates(p.email_templates),
    notifications: resolvePrefs(NOTIFICATIONS, p.notification_prefs),
    communications: resolvePrefs(COMMUNICATIONS, p.communication_prefs),
    stripe: {
      connected: Boolean(p.stripe_connected_at),
      connectedAt: p.stripe_connected_at,
      schedule: PAYOUT_SCHEDULES.some((s) => s.value === p.payout_schedule) ? (p.payout_schedule as PayoutSchedule) : "weekly",
      minimum: Number(p.payout_minimum) || 0,
    },
  };
}
