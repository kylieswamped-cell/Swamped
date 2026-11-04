"use server";

import { revalidatePath } from "next/cache";
import { escapeHtml as escape, formatMessage, sendEmail } from "@/lib/email/send";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { PARTNER_TYPES } from "./options";
import { PARTNER_SUPPORT_CATEGORIES } from "./program";

export type PartnerResult = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const clean = (v: FormDataEntryValue | null, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "";

/** Enrolls the signed-in user in the Partner Program (one application per account). */
export async function applyToPartnerProgram(_prev: PartnerResult, form: FormData): Promise<PartnerResult> {
  if (!isSupabaseConfigured) return { error: "Partner enrollment isn't available right now." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email_confirmed_at) return { error: "Your session has expired. Please log in again." };

  const fullName = clean(form.get("fullName"), 120);
  const email = clean(form.get("email"), 254);
  const businessName = clean(form.get("businessName"), 200);
  const type = PARTNER_TYPES.find((t) => t.value === form.get("partnerType"));
  const audience = clean(form.get("audience"), 2000);

  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2) fieldErrors.fullName = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (!type) fieldErrors.partnerType = "Choose the option that best describes you.";
  if (form.get("terms") !== "on") fieldErrors.terms = "Please agree to the Partner Program terms.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { error } = await supabase.from("partner_applications").insert({
    full_name: fullName,
    email,
    business_name: businessName || null,
    partner_type: type!.value,
    audience: audience || null,
  });
  if (error) {
    // Unique violation: they've already applied (e.g. a double submit).
    if (error.code === "23505") {
      revalidatePath("/partner-program");
      return { ok: true };
    }
    console.error("Partner application insert failed", error);
    return { error: "We couldn't submit your application. Please try again." };
  }

  const to = process.env.SUPPORT_EMAIL;
  if (to) {
    const sent = await sendEmail({
      to,
      replyTo: email,
      subject: `[Partner Program] New application: ${fullName}`,
      html: `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#0f172a">
        <h2 style="margin:0 0 16px;font-size:18px">New Partner Program application</h2>
        <p style="margin:0 0 4px">${escape(fullName)} · ${escape(email)}</p>
        <p style="margin:0 0 4px;color:#64748b">${escape(businessName || "No business name")} · ${escape(type!.label)}</p>
        ${audience ? `<div style="margin-top:16px;font-size:15px;line-height:24px">${formatMessage(audience)}</div>` : ""}
      </body></html>`,
    });
    if (!sent.ok) console.error("Partner application email not sent", sent.code);
  }

  revalidatePath("/partner-program");
  return { ok: true };
}

async function signedInPartnerUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email_confirmed_at ? { supabase, user: data.user } : null;
}

/** Partner portal Settings: contact details and notification choices. */
export async function updatePartnerSettings(input: {
  fullName: string;
  email: string;
  businessName: string;
  phone: string;
  website: string;
  audience: string;
  notifySignups: boolean;
  notifyPayouts: boolean;
}): Promise<PartnerResult> {
  const ctx = await signedInPartnerUser();
  if (!ctx) return { error: "Your session has expired. Please log in again." };
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const fullName = text(input.fullName, 120);
  const email = text(input.email, 254);
  const website = text(input.website, 300);
  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2) fieldErrors.fullName = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (website && !/^(https?:\/\/)?[^\s.]+\.[^\s]+$/i.test(website)) fieldErrors.website = "Enter a valid website address.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { data, error } = await ctx.supabase
    .from("partner_applications")
    .update({
      full_name: fullName,
      email,
      business_name: text(input.businessName, 200) || null,
      phone: text(input.phone, 40) || null,
      website: website || null,
      audience: text(input.audience, 2000) || null,
      notify_signups: Boolean(input.notifySignups),
      notify_payouts: Boolean(input.notifyPayouts),
    })
    .eq("owner_id", ctx.user.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("Partner settings update failed", error);
    return { error: "We couldn't save your settings. Please try again." };
  }
  revalidatePath("/partner", "layout");
  return { ok: true };
}

/** Partner Help Center ticket: saved with the support requests and emailed to support when set up. */
export async function submitPartnerSupport(input: { category: string; subject: string; message: string }): Promise<PartnerResult> {
  const ctx = await signedInPartnerUser();
  if (!ctx) return { error: "Your session has expired. Please log in again." };
  const category = PARTNER_SUPPORT_CATEGORIES.find((c) => c.value === input.category);
  const subject = typeof input.subject === "string" ? input.subject.trim().slice(0, 200) : "";
  const message = typeof input.message === "string" ? input.message.trim().slice(0, 5000) : "";
  const fieldErrors: Record<string, string> = {};
  if (!category) fieldErrors.category = "Choose an inquiry category.";
  if (!subject) fieldErrors.subject = "Enter a subject.";
  if (!message) fieldErrors.message = "Tell us how we can help.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { data: row, error } = await ctx.supabase.from("support_requests").insert({ category: category!.value, subject, message }).select("id").single();
  if (error || !row) {
    console.error("Partner support request insert failed", error);
    return { error: "We couldn't send your request. Please try again." };
  }

  const to = process.env.SUPPORT_EMAIL;
  if (to) {
    const sent = await sendEmail({
      to,
      replyTo: ctx.user.email ?? undefined,
      subject: `[Partner Support · ${category!.label}] ${subject}`,
      html: `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#0f172a">
        <p style="margin:0 0 4px;color:#64748b;font-size:13px">Partner · ${escape(ctx.user.email ?? "")}</p>
        <h2 style="margin:0 0 16px;font-size:18px">${escape(subject)}</h2>
        <p style="margin:0 0 8px;font-size:13px;color:#64748b">Category: ${escape(category!.label)} · Request ${row.id}</p>
        <div style="font-size:15px;line-height:24px">${formatMessage(message)}</div>
      </body></html>`,
    });
    if (sent.ok) await ctx.supabase.from("support_requests").update({ emailed_at: new Date().toISOString() }).eq("id", row.id);
    else console.error("Partner support email not sent", sent.code);
  }
  return { ok: true };
}
