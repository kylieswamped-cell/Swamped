import { formatMoney, lineTotal } from "@/lib/quotes/totals";
import type { EmailTemplate } from "@/lib/settings/templates";
import { escapeHtml as escape, formatMessage, sendEmail, type EmailAttachment, type EmailResult } from "./send";

type QuoteEmail = {
  to: string;
  customerName: string;
  businessName: string;
  replyTo: string;
  quoteNumber: string;
  title: string | null;
  expiresOn: string;
  /** The message body; supports the light formatting in formatMessage. */
  message: string | null;
  terms: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
  totals: { subtotal: number; discount: number; tax: number; total: number; deposit: number };
  /** Defaults to "Quote Q-1001 from Business". */
  subject?: string;
  attachments?: EmailAttachment[];
};

const paragraphs = (s: string) => escape(s).replace(/\n/g, "<br>");

const longDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function renderHtml(q: QuoteEmail) {
  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:6px 0;color:#64748b;font-size:14px">${label}</td>
      <td style="padding:6px 0;text-align:right;font-size:${strong ? 18 : 14}px;${
        strong ? "font-weight:700;color:#059669" : "color:#0f172a"
      }">${value}</td>
    </tr>`;

  const items = q.items
    .map(
      (i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a">${escape(i.description)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;text-align:center">${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;text-align:right">${formatMoney(lineTotal(i))}</td>
    </tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#0b192c;padding:32px">
          <p style="margin:0;color:#00c9a7;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Quote ${escape(q.quoteNumber)}</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px">${escape(q.businessName)} sent you a quote</h1>
          ${q.title ? `<p style="margin:8px 0 0;color:#cbd5e1;font-size:15px">${escape(q.title)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:32px">
          ${
            q.message
              ? `<div style="margin:0 0 24px;font-size:15px;line-height:24px;color:#475569">${formatMessage(q.message)}</div>`
              : `<p style="margin:0 0 24px;font-size:15px;color:#0f172a">Hi ${escape(q.customerName)},</p>`
          }
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <th style="text-align:left;font-size:11px;color:#94a3b8;letter-spacing:.6px;text-transform:uppercase;padding-bottom:8px">Item</th>
              <th style="text-align:center;font-size:11px;color:#94a3b8;letter-spacing:.6px;text-transform:uppercase;padding-bottom:8px">Qty</th>
              <th style="text-align:right;font-size:11px;color:#94a3b8;letter-spacing:.6px;text-transform:uppercase;padding-bottom:8px">Total</th>
            </tr>
            ${items}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">
            ${row("Subtotal", formatMoney(q.totals.subtotal))}
            ${q.totals.discount ? row("Discount", `-${formatMoney(q.totals.discount)}`) : ""}
            ${q.totals.tax ? row("Tax", formatMoney(q.totals.tax)) : ""}
            ${row("Grand Total", formatMoney(q.totals.total), true)}
            ${q.totals.deposit ? row("Required Deposit", formatMoney(q.totals.deposit)) : ""}
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#64748b">This quote is valid until ${escape(longDate(q.expiresOn))}. Reply to this email to approve it or ask any questions.</p>
          ${
            q.terms
              ? `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:12px;font-size:12px;line-height:18px;color:#64748b"><strong style="color:#0f172a">Terms and Conditions</strong><br>${paragraphs(q.terms)}</div>`
              : ""
          }
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Sent with Swamped</p>
    </td></tr>
  </table>
</body></html>`;
}

export function sendQuoteEmail(q: QuoteEmail): Promise<EmailResult> {
  return sendEmail({
    to: q.to,
    replyTo: q.replyTo,
    subject: q.subject || `Quote ${q.quoteNumber} from ${q.businessName}`,
    html: renderHtml(q),
    attachments: q.attachments,
  });
}

/** Receipt for a deposit recorded against a quote. */
export function sendDepositReceipt(r: {
  to: string;
  customerName: string;
  businessName: string;
  replyTo: string;
  quoteNumber: string;
  amount: number;
  paidOn: string;
  method: string;
  reference: string | null;
  remaining: number;
  /** The saved Settings template, already filled in; replaces the greeting and subject. */
  template?: EmailTemplate;
}): Promise<EmailResult> {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#64748b;font-size:14px">${label}</td><td style="padding:6px 0;text-align:right;font-size:14px;color:#0f172a">${value}</td></tr>`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <tr><td style="background:#0b192c;padding:28px 32px">
        <p style="margin:0;color:#00c9a7;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Deposit Receipt</p>
        <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px">${escape(r.businessName)} received your deposit</h1>
      </td></tr>
      <tr><td style="padding:28px 32px">
        ${
          r.template
            ? `<div style="margin:0 0 16px;font-size:15px;line-height:24px;color:#0f172a">${formatMessage(r.template.body)}</div>`
            : `<p style="margin:0 0 16px;font-size:15px;color:#0f172a">Hi ${escape(r.customerName)}, thank you for your payment.</p>`
        }
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("Quote", escape(r.quoteNumber))}
          ${row("Amount received", `<strong style="color:#059669">${formatMoney(r.amount)}</strong>`)}
          ${row("Date", escape(r.paidOn))}
          ${row("Method", escape(r.method))}
          ${r.reference ? row("Reference", escape(r.reference)) : ""}
          ${row("Remaining balance", formatMoney(r.remaining))}
        </table>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Sent with Swamped</p>
  </td></tr></table>
</body></html>`;
  return sendEmail({ to: r.to, replyTo: r.replyTo, subject: r.template?.subject || `Deposit received for quote ${r.quoteNumber}`, html });
}
