import { formatMoney } from "@/lib/quotes/totals";
import { escapeHtml as escape, sendEmail, type EmailResult } from "./send";

/** Receipt for money returned to a customer outside Swamped. */
export function sendRefundReceipt(r: {
  to: string;
  customerName: string;
  businessName: string;
  replyTo: string;
  refundNumber: string;
  /** What the refund was against, e.g. "Invoice INV-2026-004". */
  regarding: string;
  amount: number;
  refundedOn: string;
  method: string;
  reference: string | null;
}): Promise<EmailResult> {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#64748b;font-size:14px">${label}</td><td style="padding:6px 0;text-align:right;font-size:14px;color:#0f172a">${value}</td></tr>`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <tr><td style="background:#0b192c;padding:28px 32px">
        <p style="margin:0;color:#00c9a7;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Refund Receipt</p>
        <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px">${escape(r.businessName)} sent you a refund</h1>
      </td></tr>
      <tr><td style="padding:28px 32px">
        <p style="margin:0 0 16px;font-size:15px;color:#0f172a">Hi ${escape(r.customerName)}, here are the details of your refund.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("Refund", escape(r.refundNumber))}
          ${row("For", escape(r.regarding))}
          ${row("Amount refunded", `<strong style="color:#dc2626">${formatMoney(r.amount)}</strong>`)}
          ${row("Date", escape(r.refundedOn))}
          ${row("Method", escape(r.method))}
          ${r.reference ? row("Reference", escape(r.reference)) : ""}
        </table>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Sent with Swamped</p>
  </td></tr></table>
</body></html>`;
  return sendEmail({ to: r.to, replyTo: r.replyTo, subject: `Refund ${r.refundNumber} from ${r.businessName}`, html });
}
