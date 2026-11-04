export type EmailAttachment = { filename: string; content: string /* base64 */ };

export type EmailResult = { ok: true } | { ok: false; reason: string; code: string };

/** Sends one email through Resend. Needs RESEND_API_KEY and EMAIL_FROM. */
export async function sendEmail(email: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, reason: "email sending isn't set up yet.", code: "ERR_EMAIL_NOT_CONFIGURED" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email.to],
        reply_to: email.replyTo || undefined,
        subject: email.subject,
        html: email.html,
        attachments: email.attachments?.length ? email.attachments : undefined,
      }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      return { ok: false, reason: "the email service rejected it.", code: `ERR_EMAIL_REJECTED_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("Resend request failed", err);
    return { ok: false, reason: "the email service couldn't be reached.", code: "ERR_EMAIL_UNREACHABLE" };
  }
}

// The formatter lives in its own module so the Settings preview can use it in the browser.
export { escapeHtml, formatMessage } from "./format";
