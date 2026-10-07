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

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The message box's light formatting, as email HTML: **bold**, _italic_,
 * ++underline++, [links](https://…), "- " bullets, and "1. " numbered lines.
 * Text is escaped first, so nothing typed can inject markup.
 */
export function formatMessage(text: string) {
  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" style="color:#059669">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\+\+(.+?)\+\+/g, "<u>$1</u>")
      .replace(/(^|[^\w])_(.+?)_(?=[^\w]|$)/g, "$1<em>$2</em>");

  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const line of text.split(/\r?\n/)) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const kind = bullet ? "ul" : "ol";
      if (list !== kind) {
        close();
        out.push(`<${kind} style="margin:0 0 12px;padding-left:20px">`);
        list = kind;
      }
      out.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
      continue;
    }
    close();
    out.push(line.trim() ? `${inline(line)}<br>` : "<br>");
  }
  close();
  return out.join("");
}
