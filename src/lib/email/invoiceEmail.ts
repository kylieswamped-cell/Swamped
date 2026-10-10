import { formatMoney, lineTotal } from "@/lib/quotes/totals";
import type { EmailTemplate } from "@/lib/settings/templates";
import { escapeHtml as escape, formatMessage, sendEmail, type EmailAttachment, type EmailResult } from "./send";

type InvoiceEmail = {
  to: string;
  customerName: string;
  businessName: string;
  replyTo: string;
  invoiceNumber: string;
  title: string | null;
  dueOn: string;
  /** The message body; supports the light formatting in formatMessage. */
  message: string | null;
  terms: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
  totals: { subtotal: number; discount: number; tax: number; total: number; paid: number; balance: number };
  /** The customer-facing page where the invoice can be viewed. */
  viewUrl?: string;
  subject?: string;
  attachments?: EmailAttachment[];
};

const paragraphs = (s: string) => escape(s).replace(/\n/g, "<br>");

const longDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function renderHtml(i: InvoiceEmail) {
  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:6px 0;color:#64748b;font-size:14px">${label}</td>
      <td style="padding:6px 0;text-align:right;font-size:${strong ? 18 : 14}px;${
        strong ? "font-weight:700;color:#059669" : "color:#0f172a"
      }">${value}</td>
    </tr>`;

  const items = i.items
    .map(
      (it) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a">${escape(it.description)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;text-align:center">${it.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;text-align:right">${formatMoney(lineTotal(it))}</td>
    </tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#0b192c;padding:32px">
          <p style="margin:0;color:#00c9a7;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Invoice ${escape(i.invoiceNumber)}</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px">${escape(i.businessName)} sent you an invoice</h1>
          ${i.title ? `<p style="margin:8px 0 0;color:#cbd5e1;font-size:15px">${escape(i.title)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:32px">
          ${
            i.message
              ? `<div style="margin:0 0 24px;font-size:15px;line-height:24px;color:#475569">${formatMessage(i.message)}</div>`
              : `<p style="margin:0 0 24px;font-size:15px;color:#0f172a">Hi ${escape(i.customerName)},</p>`
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
            ${row("Subtotal", formatMoney(i.totals.subtotal))}
            ${i.totals.discount ? row("Discount", `-${formatMoney(i.totals.discount)}`) : ""}
            ${i.totals.tax ? row("Tax", formatMoney(i.totals.tax)) : ""}
            ${row("Grand Total", formatMoney(i.totals.total))}
            ${i.totals.paid ? row("Paid", `-${formatMoney(i.totals.paid)}`) : ""}
            ${row("Balance Due", formatMoney(i.totals.balance), true)}
          </table>
          ${
            i.viewUrl
              ? `<p style="margin:28px 0 0;text-align:center"><a href="${escape(i.viewUrl)}" style="display:inline-block;background:#00c185;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px">View Invoice</a></p>`
              : ""
          }
          <p style="margin:24px 0 0;font-size:13px;color:#64748b">Payment is due by ${escape(longDate(i.dueOn))}. Reply to this email with any questions.</p>
          ${
            i.terms
              ? `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:12px;font-size:12px;line-height:18px;color:#64748b"><strong style="color:#0f172a">Terms and Conditions</strong><br>${paragraphs(i.terms)}</div>`
              : ""
          }
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Sent with Swamped</p>
    </td></tr>
  </table>
</body></html>`;
}

export function sendInvoiceEmail(i: InvoiceEmail): Promise<EmailResult> {
  return sendEmail({
    to: i.to,
    replyTo: i.replyTo,
    subject: i.subject || `Invoice ${i.invoiceNumber} from ${i.businessName}`,
    html: renderHtml(i),
    attachments: i.attachments,
  });
}

/** Receipt for a payment recorded against an invoice. */
export function sendPaymentReceipt(r: {
  to: string;
  customerName: string;
  businessName: string;
  replyTo: string;
  invoiceNumber: string;
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
        <p style="margin:0;color:#00c9a7;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Payment Receipt</p>
        <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px">${escape(r.businessName)} received your payment</h1>
      </td></tr>
      <tr><td style="padding:28px 32px">
        ${
          r.template
            ? `<div style="margin:0 0 16px;font-size:15px;line-height:24px;color:#0f172a">${formatMessage(r.template.body)}</div>`
            : `<p style="margin:0 0 16px;font-size:15px;color:#0f172a">Hi ${escape(r.customerName)}, thank you for your payment.</p>`
        }
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("Invoice", escape(r.invoiceNumber))}
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
  return sendEmail({ to: r.to, replyTo: r.replyTo, subject: r.template?.subject || `Payment received for invoice ${r.invoiceNumber}`, html });
}
