"use server";

import { escapeHtml as escape, formatMessage, sendEmail } from "@/lib/email/send";
import { getProfile } from "@/lib/onboarding/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { MAX_SUPPORT_FILES, SUPPORT_CATEGORIES } from "./options";

export type SupportResult = { error?: string; fieldErrors?: Record<string, string>; id?: string };

const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");

/**
 * Saves a support request (files are already uploaded by the browser), then
 * emails it to the support inbox when SUPPORT_EMAIL and email sending are set up.
 */
export async function submitSupportRequest(input: {
  category: string;
  subject: string;
  message: string;
  attachments: string[];
}): Promise<SupportResult> {
  if (!isSupabaseConfigured) return { error: "Support requests aren't available right now." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email_confirmed_at) return { error: "Your session has expired. Please log in again." };

  const fieldErrors: Record<string, string> = {};
  const category = SUPPORT_CATEGORIES.find((c) => c.value === input.category);
  if (!category) fieldErrors.category = "Choose an issue type.";
  const subject = clean(input.subject, 200);
  if (!subject) fieldErrors.subject = "Enter a subject.";
  const message = clean(input.message, 5000);
  if (!message) fieldErrors.message = "Describe your request.";
  const attachments = (input.attachments ?? []).filter((p) => typeof p === "string" && p.startsWith(`${user.id}/support/`));
  if (attachments.length > MAX_SUPPORT_FILES) fieldErrors.attachments = `Attach up to ${MAX_SUPPORT_FILES} files.`;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const { data: row, error } = await supabase
    .from("support_requests")
    .insert({ category: category!.value, subject, message, attachment_paths: attachments })
    .select("id")
    .single();
  if (error || !row) {
    console.error("Support request insert failed", error);
    return { error: "We couldn't send your request. Please try again." };
  }

  const to = process.env.SUPPORT_EMAIL;
  if (to) {
    const profile = await getProfile(supabase, user.id);
    // Signed links so the support team can open the files for a week.
    const links = await Promise.all(
      attachments.map(async (path) => {
        const { data: signed } = await supabase.storage.from("attachments").createSignedUrl(path, 60 * 60 * 24 * 7);
        return signed ? `<li><a href="${escape(signed.signedUrl)}">${escape(path.split("/").pop() ?? "file")}</a></li>` : "";
      }),
    );
    const sent = await sendEmail({
      to,
      replyTo: user.email ?? undefined,
      subject: `[Support · ${category!.label}] ${subject}`,
      html: `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#0f172a">
        <p style="margin:0 0 4px;color:#64748b;font-size:13px">${escape(profile.legal_business_name ?? "")} · ${escape(user.email ?? "")}</p>
        <h2 style="margin:0 0 16px;font-size:18px">${escape(subject)}</h2>
        <p style="margin:0 0 8px;font-size:13px;color:#64748b">Category: ${escape(category!.label)} · Request ${row.id}</p>
        <div style="font-size:15px;line-height:24px">${formatMessage(message)}</div>
        ${attachments.length ? `<p style="margin:16px 0 4px;font-weight:600">Attachments</p><ul>${links.join("")}</ul>` : ""}
      </body></html>`,
    });
    if (sent.ok) await supabase.from("support_requests").update({ emailed_at: new Date().toISOString() }).eq("id", row.id);
    else console.error("Support email not sent", sent.code);
  }

  return { id: row.id };
}
