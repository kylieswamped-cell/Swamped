"use client";

import Image from "next/image";
import { useState, useTransition, type ReactNode } from "react";
import { publicFileUrl } from "@/lib/portal/actions";
import type { PublicInvoice, PublicInvoiceState } from "@/lib/portal/invoices";
import { formatMoney, lineTotal } from "@/lib/quotes/totals";

const shortDate = (isoDate: string) =>
  new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const percent = (n: number) => `${Number(n.toFixed(3))}%`;

const infoLabel = "text-[12px] font-medium leading-4 text-[#64748b]";
const infoValue = "text-[16px] font-bold leading-6 text-[#1e293b]";
const groupHeading = "text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#94a3b8]";
const darkHeading = "text-[12px] font-bold uppercase leading-4 tracking-[1.5px] text-[#1e293b]";
const th = "h-[49px] text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#94a3b8]";

/** Figma "Public Invoice Status States" (685:443): banner, badge and amount label per state. */
const STATES: Record<
  PublicInvoiceState,
  {
    banner: { box: string; text: string; icon: string; iconBox?: string; iconSize: [number, number] };
    badge: { label: string; box: string; text: string; icon?: string };
    amountLabel: string;
    amountLabelClass: string;
  }
> = {
  paid: {
    banner: { box: "bg-[#ecfdf5] border-b border-[#d1fae5]", text: "font-medium text-[#065f46]", icon: "/portal/status-paid.svg", iconBox: "bg-[#d1fae5]", iconSize: [16, 16] },
    badge: { label: "Paid", box: "bg-[#d1fae5]", text: "text-[#047857] tracking-[0.4px]", icon: "/portal/badge-check.svg" },
    amountLabel: "Balance Due",
    amountLabelClass: "font-semibold text-[#64748b]",
  },
  outstanding: {
    banner: { box: "bg-[#eff6ff] border-b border-[#dbeafe]", text: "font-medium text-[#1e40af]", icon: "/portal/status-info.svg", iconBox: "bg-[#dbeafe]", iconSize: [16, 16] },
    badge: { label: "Unpaid", box: "bg-[#dbeafe]", text: "text-[#2563eb] tracking-[1px]" },
    amountLabel: "Current Amount Due",
    amountLabelClass: "font-semibold text-[#64748b]",
  },
  past_due: {
    banner: { box: "bg-[#ef4444]", text: "font-bold text-white", icon: "/portal/status-warning.svg", iconSize: [16, 14] },
    badge: { label: "Past Due", box: "bg-[#fef3c7]", text: "text-[#ef4444] tracking-[1.1px]", icon: "/portal/badge-past-due.svg" },
    amountLabel: "Balance Overdue",
    amountLabelClass: "font-bold text-[#d97706]",
  },
  void: {
    banner: { box: "bg-[#f3f4f6] border-b border-[#e5e7eb]", text: "font-medium text-[#4b5563]", icon: "/portal/status-void.svg", iconBox: "bg-[#e5e7eb]", iconSize: [16, 16] },
    badge: { label: "Void", box: "bg-[#e5e7eb]", text: "text-[#6b7280] tracking-[0.1px]" },
    amountLabel: "Amount Due",
    amountLabelClass: "font-semibold text-[#9ca3af]",
  },
};

function TotalRow({ label, value, labelClass = "", valueClass = "" }: { label: ReactNode; value: string; labelClass?: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-[14px] leading-5 text-[#737373] ${labelClass}`}>{label}</span>
      <span className={`text-[14px] font-medium leading-5 text-[#1f2937] ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function CustomerInvoiceView({ token, invoice }: { token: string; invoice: PublicInvoice }) {
  const [fileError, setFileError] = useState<string>();
  const [opening, startOpening] = useTransition();

  const s = STATES[invoice.state];
  const t = invoice.totals;
  const b = invoice.business;
  const business = b.name || "the business";
  const cityLine = [b.city, [b.state, b.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const businessLines = [b.name, b.street, cityLine, [b.phone, b.email].filter(Boolean).join(" "), b.website].filter(Boolean) as string[];
  const dueText = invoice.dueDays === 0 ? "Due upon receipt" : `Due ${shortDate(invoice.dueOn)}`;

  const bannerText: Record<PublicInvoiceState, string> = {
    paid: "Thank you! This invoice has been settled in full.",
    outstanding: `Payment for this invoice is due by ${shortDate(invoice.dueOn)}.`,
    past_due: "Warning: This invoice is past its due date. Please settle the remaining balance immediately to avoid service interruptions.",
    void: `This invoice has been voided and is no longer valid for payment. Please contact ${business} if you think this is a mistake.`,
  };

  const openFile = (path: string) => {
    setFileError(undefined);
    startOpening(async () => {
      const result = await publicFileUrl("invoice", token, path);
      if (result.error || !result.url) return setFileError(result.error ?? "Couldn't open the file.");
      window.location.assign(result.url);
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-6 text-[#0f172a] sm:py-12 print:bg-white print:p-0">
      <article
        className={`mx-auto max-w-[896px] overflow-hidden rounded-2xl border bg-white shadow-[0_8px_10px_-6px_rgba(0,0,0,0.1),0_20px_25px_-5px_rgba(0,0,0,0.1)] print:shadow-none ${
          invoice.state === "past_due" ? "border-2 border-[#ef4444]" : "border-[#f1f5f9]"
        }`}
      >
        {/* Status banner */}
        <div className={`flex items-center gap-3 px-5 py-3 sm:px-8 ${s.banner.box} ${s.banner.iconBox ? "sm:py-4" : ""}`}>
          {s.banner.iconBox ? (
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${s.banner.iconBox}`}>
              <Image src={s.banner.icon} alt="" width={s.banner.iconSize[0]} height={s.banner.iconSize[1]} />
            </span>
          ) : (
            <Image src={s.banner.icon} alt="" width={s.banner.iconSize[0]} height={s.banner.iconSize[1]} className="shrink-0" />
          )}
          <p className={`text-[14px] leading-5 ${s.banner.text}`}>{bannerText[invoice.state]}</p>
        </div>

        {/* Business */}
        <header className="flex flex-col-reverse gap-4 bg-[#f8fafc] px-5 pb-8 pt-6 sm:flex-row sm:items-start sm:justify-between sm:px-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="" width={40} height={40} className="mix-blend-multiply" />
              <span className="text-[20px] font-bold uppercase leading-7 tracking-[-0.5px] text-[#001e74]">Swamped</span>
            </div>
            <div className="mt-3 text-[15px] leading-[24.38px] text-[#64748b]">
              {businessLines.map((line, i) => (
                <p key={i} className="break-words">{line}</p>
              ))}
            </div>
          </div>
          <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 self-start rounded-full px-3 ${s.badge.box}`}>
            {s.badge.icon && <Image src={s.badge.icon} alt="" width={11} height={11} className="h-3 w-auto" />}
            <span className={`text-[12px] font-bold uppercase leading-4 ${s.badge.text}`}>{s.badge.label}</span>
          </span>
        </header>

        {/* Amount due */}
        <section className="border-b border-[#f1f5f9] bg-gradient-to-b from-[#f8fafc] to-white px-5 py-10 sm:px-10">
          <p className={`text-[14px] uppercase leading-5 tracking-[1.4px] ${s.amountLabelClass}`}>{s.amountLabel}</p>
          <p
            className={`mt-0 text-[40px] font-extrabold leading-[48px] tracking-[-1.8px] sm:text-[48px] ${
              invoice.state === "void" ? "text-[#d1d5db] line-through" : "text-[#0f172a]"
            }`}
          >
            {formatMoney(invoice.state === "void" ? t.total : invoice.balance)}
          </p>
          {invoice.state === "void" && <p className="mt-1 text-[14px] italic leading-5 tracking-[0.2px] text-[#9ca3af]">No payment required</p>}
        </section>

        <div className="px-5 pb-10 sm:px-10">
          {/* Billed to and invoice information */}
          <div className="grid gap-10 py-10 md:grid-cols-2 md:gap-8">
            <div className="min-w-0">
              <h3 className={groupHeading}>Billed To</h3>
              <p className="mt-3 text-[18px] font-bold leading-7 text-[#1e293b]">{invoice.customer.name}</p>
              {invoice.customer.address && <p className="mt-2 whitespace-pre-line text-[16px] leading-[26px] text-[#475569]">{invoice.customer.address}</p>}
              {(invoice.customer.email || invoice.customer.phone) && (
                <div className="mt-4 space-y-2">
                  {invoice.customer.email && (
                    <p className="flex items-center gap-2 text-[14px] leading-5 text-[#64748b]">
                      <Image src="/portal/mail.svg" alt="" width={14} height={11} className="w-4 shrink-0 object-contain" />
                      <span className="break-all">{invoice.customer.email}</span>
                    </p>
                  )}
                  {invoice.customer.phone && (
                    <p className="flex items-center gap-2 text-[14px] leading-5 text-[#64748b]">
                      <Image src="/portal/phone.svg" alt="" width={14} height={14} className="w-4 shrink-0 object-contain" />
                      {invoice.customer.phone}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className={groupHeading}>Invoice Information</h3>
              <dl className="mt-[18px] grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <dt className={infoLabel}>Invoice Number</dt>
                  <dd className={infoValue}>{invoice.number}</dd>
                </div>
                <div>
                  <dt className={infoLabel}>Invoice Date</dt>
                  <dd className={infoValue}>{shortDate(invoice.invoiceDate)}</dd>
                </div>
                <div>
                  <dt className={infoLabel}>Due Date</dt>
                  <dd className={`${infoValue} ${invoice.state === "past_due" ? "text-[#dc2626]" : ""}`}>{shortDate(invoice.dueOn)}</dd>
                </div>
                {invoice.quoteNumber && (
                  <div>
                    <dt className={infoLabel}>Reference</dt>
                    <dd className={infoValue}>{invoice.quoteNumber}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {invoice.title && <h2 className="text-[18px] font-bold leading-9 text-black">{invoice.title}</h2>}

          {/* Line items */}
          <div className="-mx-5 mt-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className={`${th} w-[57%] text-left`}>Item Description</th>
                  <th className={`${th} w-[11%] text-center`}>Qty</th>
                  <th className={`${th} w-[16%] text-right`}>Rate</th>
                  <th className={`${th} w-[16%] text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => {
                  const [first, ...rest] = item.description.split("\n");
                  const details = rest.join("\n").trim();
                  return (
                    <tr key={i} className="border-b border-[#f8fafc] align-top last:border-0">
                      <td className="py-6 pr-6">
                        <p className="text-[16px] font-semibold leading-6 text-[#1e293b]">{first}</p>
                        {details && <p className="whitespace-pre-line text-[14px] leading-5 text-[#64748b]">{details}</p>}
                      </td>
                      <td className="py-6 text-center text-[16px] leading-6 text-[#475569]">{item.quantity}</td>
                      <td className="py-6 text-right text-[16px] leading-6 text-[#475569]">{formatMoney(item.unitPrice)}</td>
                      <td className="py-6 text-right text-[16px] font-semibold leading-6 tracking-[0.3px] text-[#1e293b]">{formatMoney(lineTotal(item))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full space-y-4 rounded-xl border border-[#f3f4f6] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:w-[318px]">
              <div className="space-y-3">
                <TotalRow label="Subtotal" value={formatMoney(t.subtotal)} />
                {t.discount > 0 && <TotalRow label="Discount" value={`-${formatMoney(t.discount)}`} valueClass="text-[#16a34a]" />}
                {t.tax > 0 && <TotalRow label={`Tax Rate${t.taxType === "percent" ? ` (${percent(t.taxValue)})` : ""}`} value={formatMoney(t.tax)} />}
              </div>
              <div className="h-px bg-[#f3f4f6]" />
              <div className="space-y-3">
                <TotalRow label="Grand Total" value={formatMoney(t.total)} labelClass="font-semibold text-[#111827]" valueClass="font-semibold text-[#111827]" />
                {t.depositCredit > 0 && <TotalRow label="Deposit Already Paid" value={`-${formatMoney(t.depositCredit)}`} />}
                {t.amountPaid > 0 && <TotalRow label="Payments Received" value={`-${formatMoney(t.amountPaid)}`} />}
              </div>
              <div className="h-px bg-[#e5e7eb]" />
              <div className="flex items-center justify-between gap-4 pt-1">
                <div>
                  <p className="text-[16px] font-bold leading-4 tracking-[0.1px] text-[#111827]">Remaining Balance</p>
                  {invoice.state !== "void" && invoice.balance > 0 && (
                    <p className="mt-1 text-[10px] font-semibold uppercase leading-[15px] tracking-[-0.3px] text-[#737373]">{dueText}</p>
                  )}
                </div>
                <p className={`text-[24px] font-bold leading-6 tracking-[-0.4px] ${invoice.state === "void" ? "text-[#d1d5db]" : "text-[#008080]"}`}>
                  {formatMoney(invoice.state === "void" ? 0 : invoice.balance)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer-facing information */}
          {(invoice.message || invoice.attachments.length > 0 || invoice.terms) && (
            <section className="mt-10 border-t border-[#f8fafc] pt-6">
              <h2 className="flex items-center gap-3 text-[18px] font-bold leading-7 tracking-[-0.2px] text-[#0a1b2f]">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#f0fdfa]">
                  <Image src="/portal/customer-info.svg" alt="" width={18} height={14} />
                </span>
                Customer-Facing Information
              </h2>

              {(invoice.message || invoice.attachments.length > 0) && (
                <div className="mt-8 flex flex-col gap-8 md:flex-row md:justify-between">
                  {invoice.message && (
                    <div className="min-w-0 md:max-w-[388px]">
                      <h3 className={darkHeading}>Message to Customer</h3>
                      <p className="mt-2 whitespace-pre-line text-[14px] italic leading-5 text-[#64748b]">{invoice.message}</p>
                    </div>
                  )}
                  {invoice.attachments.length > 0 && (
                    <div className="w-full md:ml-auto md:w-[252px] print:hidden">
                      <h3 className={groupHeading}>Attachments</h3>
                      <ul className="mt-3 space-y-2">
                        {invoice.attachments.map((f) => (
                          <li key={f.path}>
                            <button
                              type="button"
                              onClick={() => openFile(f.path)}
                              disabled={opening}
                              className="flex min-h-[38px] w-full items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-left transition-colors hover:bg-[#f8fafc] disabled:cursor-wait"
                            >
                              <Image
                                src={/\.pdf$/i.test(f.name) ? "/portal/file-pdf-sm.svg" : "/portal/file-invoice.svg"}
                                alt=""
                                width={14}
                                height={14}
                                className="size-3.5 shrink-0 object-contain"
                              />
                              <span className="min-w-0 flex-1 break-all text-[14px] font-medium leading-5 text-[#334155]">{f.name}</span>
                              <Image src="/portal/download-sm.svg" alt={`Download ${f.name}`} width={12} height={12} className="ml-2 shrink-0" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      {fileError && <p className="mt-2 text-[12px] text-[#dc2626]">{fileError}</p>}
                    </div>
                  )}
                </div>
              )}

              {invoice.terms && (
                <div className="mt-8">
                  <h3 className={darkHeading}>Terms &amp; Conditions</h3>
                  <p className="mt-3 whitespace-pre-line text-[14px] leading-[17.88px] text-[#64748b]">{invoice.terms}</p>
                </div>
              )}
            </section>
          )}

          {/* The customer's next step */}
          <div className="mt-10 flex flex-col items-stretch gap-2 sm:items-end print:hidden">
            {invoice.state === "paid" && (
              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00c185] px-6 text-[16px] font-semibold leading-6 tracking-[0.3px] text-white transition-colors hover:bg-[#00a873]"
              >
                <Image src="/portal/download-white.svg" alt="" width={16} height={16} />
                Download Receipt
              </button>
            )}
            {(invoice.state === "outstanding" || invoice.state === "past_due") && (
              <>
                <button
                  type="button"
                  disabled
                  title="Online payments aren't available yet"
                  className={`flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg px-6 text-[18px] font-bold leading-7 text-white opacity-60 ${
                    invoice.state === "past_due" ? "bg-[#ef4444]" : "bg-[#00c185]"
                  }`}
                >
                  <Image src="/portal/pay-card.svg" alt="" width={18} height={14} />
                  Pay Invoice Balance
                </button>
                <p className="text-[13px] leading-5 text-[#64748b] sm:text-right">
                  Online payment isn&apos;t available yet. Please contact {business} to arrange payment.
                </p>
              </>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
