"use server";

import { revalidatePath } from "next/cache";
import { escapeHtml as escape, formatMessage, sendEmail } from "@/lib/email/send";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { PARTNER_TYPES } from "./options";

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
