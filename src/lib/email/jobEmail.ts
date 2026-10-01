import { formatMoney, lineTotal } from "@/lib/quotes/totals";

type JobEmail = {
  to: string;
  customerName: string;
  businessName: string;
  replyTo: string;
  jobNumber: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  notes: string | null;
  terms: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
  totals: { subtotal: number; discount: number; tax: number; total: number };
};

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const paragraphs = (s: string) => escape(s).replace(/\n/g, "<br>");

// The server doesn't know the customer's zone, so dates are written in UTC with the zone shown.
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

function renderHtml(j: JobEmail) {
  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:6px 0;color:#64748b;font-size:14px">${label}</td>
      <td style="padding:6px 0;text-align:right;font-size:${strong ? 18 : 14}px;${
        strong ? "font-weight:700;color:#059669" : "color:#0f172a"
      }">${value}</td>
    </tr>`;

  const items = j.items
    .map(
      (i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a">${escape(i.description)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;text-align:center">${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;text-align:right">${formatMoney(lineTotal(i))}</td>
    </tr>`,
    )
    .join("");

  const schedule = j.startsAt
    ? `<p style="margin:0 0 24px;font-size:15px;color:#0f172a"><strong>Scheduled:</strong> ${escape(when(j.startsAt))}${
        j.endsAt ? ` – ${escape(when(j.endsAt))}` : ""
      }</p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#0b192c;padding:32px">
          <p style="margin:0;color:#00c9a7;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Job ${escape(j.jobNumber)}</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px">${escape(j.businessName)} shared a job with you</h1>
          <p style="margin:8px 0 0;color:#cbd5e1;font-size:15px">${escape(j.title)}</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;font-size:15px;color:#0f172a">Hi ${escape(j.customerName)},</p>
          ${schedule}
          ${j.notes ? `<p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#475569">${paragraphs(j.notes)}</p>` : ""}
          ${
            j.items.length
              ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <th style="text-align:left;font-size:11px;color:#94a3b8;letter-spacing:.6px;text-transform:uppercase;padding-bottom:8px">Item</th>
              <th style="text-align:center;font-size:11px;color:#94a3b8;letter-spacing:.6px;text-transform:uppercase;padding-bottom:8px">Qty</th>
              <th style="text-align:right;font-size:11px;color:#94a3b8;letter-spacing:.6px;text-transform:uppercase;padding-bottom:8px">Total</th>
            </tr>
            ${items}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
            ${row("Subtotal", formatMoney(j.totals.subtotal))}
            ${j.totals.discount ? row("Discount", `-${formatMoney(j.totals.discount)}`) : ""}
            ${j.totals.tax ? row("Tax", formatMoney(j.totals.tax)) : ""}
            ${row("Total", formatMoney(j.totals.total), true)}
          </table>`
              : ""
          }
          <p style="margin:24px 0 0;font-size:13px;color:#64748b">Reply to this email with any questions.</p>
          ${
            j.terms
              ? `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:12px;font-size:12px;line-height:18px;color:#64748b"><strong style="color:#0f172a">Terms and Conditions</strong><br>${paragraphs(j.terms)}</div>`
              : ""
          }
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Sent with Swamped</p>
    </td></tr>
  </table>
</body></html>`;
}

/** Sends a job through Resend. Needs RESEND_API_KEY and EMAIL_FROM. */
export async function sendJobEmail(j: JobEmail): Promise<{ ok: true } | { ok: false; reason: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, reason: "email sending isn't set up yet." };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [j.to],
        reply_to: j.replyTo || undefined,
        subject: `Job ${j.jobNumber} from ${j.businessName}`,
        html: renderHtml(j),
      }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      return { ok: false, reason: "the email service rejected it." };
    }
    return { ok: true };
  } catch (err) {
    console.error("Resend request failed", err);
    return { ok: false, reason: "the email service couldn't be reached." };
  }
}
