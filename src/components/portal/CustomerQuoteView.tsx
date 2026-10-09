"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { publicQuoteFileUrl } from "@/lib/portal/actions";
import type { PublicQuote } from "@/lib/portal/quotes";
import { formatMoney, lineTotal } from "@/lib/quotes/totals";
import { ApproveQuoteModal, QuoteAcceptedModal } from "./QuoteAcceptModals";

const longDate = (isoDate: string) =>
  new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

const percent = (n: number) => `${Number(n.toFixed(3))}%`;

type Badge = { label: string; box: string; dot: string; text: string };

const BADGES: Record<"awaiting" | "accepted" | "expired" | "declined", Badge> = {
  awaiting: { label: "Awaiting Action", box: "bg-[#ecfdf5] border-[#d1fae5]", dot: "bg-[#10b981]", text: "text-[#047857]" },
  accepted: { label: "Accepted", box: "bg-[#ecfdf5] border-[#d1fae5]", dot: "bg-[#10b981]", text: "text-[#047857]" },
  expired: { label: "Expired", box: "bg-[#fffbeb] border-[#fef3c7]", dot: "bg-[#f59e0b]", text: "text-[#b45309]" },
  declined: { label: "Declined", box: "bg-[#fef2f2] border-[#fee2e2]", dot: "bg-[#ef4444]", text: "text-[#b91c1c]" },
};

const metaLabel = "text-[12px] font-semibold uppercase leading-4 tracking-[0.4px] text-[#94a3b8]";
const metaValue = "mt-0 text-[16px] font-medium leading-6 tracking-[-0.4px] text-[#334155]";
const th = "h-12 text-[12px] font-bold uppercase leading-4 tracking-[0.6px] text-[#94a3b8]";
const sectionHeading = "text-[14px] font-bold uppercase leading-5 tracking-[0.7px] text-[#0f172a]";

/** "Scope: Work is limited..." → bold "Scope:" then the rest. */
function TermLine({ line }: { line: string }) {
  const m = /^([^:]{1,40}:)\s*(.*)$/.exec(line);
  if (!m) return <span className="text-[#64748b]">{line}</span>;
  return (
    <>
      <span className="font-bold text-[#0f172a]">{m[1]}</span> <span className="text-[#64748b]">{m[2]}</span>
    </>
  );
}

export default function CustomerQuoteView({ token, quote }: { token: string; quote: PublicQuote }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"approve" | "accepted" | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [opening, startOpening] = useTransition();

  const state = quote.status === "accepted" ? "accepted" : quote.status === "declined" ? "declined" : quote.expired ? "expired" : "awaiting";
  const badge = BADGES[state];
  const b = quote.business;
  const cityLine = [b.city, [b.state, b.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const businessLines = [b.name, b.street, cityLine, [b.phone, b.email].filter(Boolean).join(" "), b.website].filter(Boolean) as string[];
  const terms = (quote.terms ?? "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const t = quote.totals;
  const depositDue = t.deposit > 0 && !quote.depositReceived ? t.deposit : 0;

  const openFile = (path: string) => {
    setFileError(undefined);
    startOpening(async () => {
      const result = await publicQuoteFileUrl(token, path);
      if (result.error || !result.url) return setFileError(result.error ?? "Couldn't open the file.");
      window.location.assign(result.url);
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 pb-[120px] pt-6 text-[#0f172a] sm:pt-12 print:bg-white print:p-0">
      <article className="mx-auto max-w-[1024px] rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] print:border-0 print:shadow-none">
        {/* Business and quote summary */}
        <header className="border-b border-[#f1f5f9] px-5 pb-8 pt-[18px] sm:px-10">
          <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Image src="/images/logo.png" alt="" width={40} height={40} className="mix-blend-multiply" />
                <span className="text-[20px] font-bold uppercase leading-7 tracking-[-0.5px] text-[#001e74]">Swamped</span>
              </div>
              <div className="mt-[17px] text-[15px] leading-[24.38px] text-[#64748b]">
                {businessLines.map((line, i) => (
                  <p key={i} className="break-words">{line}</p>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end">
              <span className={`inline-flex h-6 items-center gap-2 rounded-full border px-3 ${badge.box}`}>
                <span className={`size-2 rounded-full ${badge.dot}`} />
                <span className={`text-[12px] font-semibold uppercase leading-4 tracking-[0.6px] ${badge.text}`}>{badge.label}</span>
              </span>
              <p className="mt-4 text-[14px] font-medium uppercase leading-5 tracking-[1.4px] text-[#64748b]">Total Amount</p>
              <p className="text-[36px] font-bold leading-10 tracking-[-0.8px] text-[#0f172a]">{formatMoney(t.total)}</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold leading-8 text-[#0f172a] sm:text-[30px] sm:leading-9">{quote.title || `Quote ${quote.number}`}</h1>
              <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-3">
                <div>
                  <dt className={metaLabel}>Reference</dt>
                  <dd className={metaValue}>{quote.number}</dd>
                </div>
                <div>
                  <dt className={metaLabel}>Issued</dt>
                  <dd className={metaValue}>{longDate(quote.quoteDate)}</dd>
                </div>
                {quote.expiresOn && (
                  <div>
                    <dt className={metaLabel}>Valid Until</dt>
                    <dd className={`${metaValue} ${state === "expired" ? "text-[#dc2626]" : ""}`}>{longDate(quote.expiresOn)}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="sm:text-right">
              <p className="text-[14px] font-medium leading-5 text-[#64748b]">Billed To:</p>
              <p className="text-[18px] font-semibold leading-[24.75px] tracking-[0.3px] text-[#0f172a]">{quote.customer.name}</p>
              {quote.customer.address && <p className="text-[14px] leading-5 text-[#64748b]">{quote.customer.address}</p>}
            </div>
          </div>
        </header>

        <div className="px-5 pb-10 pt-8 sm:px-10">
          {/* Line items */}
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  <th className={`${th} w-[50%] text-left`}>Description</th>
                  <th className={`${th} w-[13%] text-center`}>Quantity</th>
                  <th className={`${th} w-[13.5%] text-right`}>Unit Price</th>
                  <th className={`${th} w-[12.5%] text-center`}>Tax</th>
                  <th className={`${th} w-[11%] text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, i) => {
                  const [first, ...rest] = item.description.split("\n");
                  const details = rest.join("\n").trim();
                  return (
                    <tr key={i} className="align-top">
                      <td className="py-6 pr-6">
                        <p className="text-[18px] font-bold leading-7 text-[#1e293b]">{first}</p>
                        {details && (
                          <p className="mt-2 whitespace-pre-line border-l border-[#e2e8f0] pl-4 text-[14px] italic leading-[22.75px] text-[#64748b]">{details}</p>
                        )}
                      </td>
                      <td className="py-6 pt-7 text-center text-[16px] font-medium leading-6 text-[#334155]">{item.quantity}</td>
                      <td className="py-6 pt-7 text-right text-[16px] font-medium leading-6 tracking-[0.6px] text-[#334155]">{formatMoney(item.unitPrice)}</td>
                      <td className="py-6 pt-7 text-center">
                        {item.taxable ? (
                          <span className="inline-flex h-5 items-center rounded-md border border-[#d1fae5] bg-[#ecfdf5] px-2 text-[12px] font-medium leading-4 tracking-[0.3px] text-[#047857]">Taxable</span>
                        ) : (
                          <span className="text-[14px] text-[#94a3b8]">—</span>
                        )}
                      </td>
                      <td className="py-6 pt-7 text-right text-[16px] font-bold leading-6 tracking-[0.5px] text-[#0f172a]">{formatMoney(lineTotal(item))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-2 flex justify-end">
            <div className="w-full space-y-3 sm:w-[288px]">
              <div className="flex items-center justify-between">
                <span className="text-[16px] leading-6 tracking-[-0.3px] text-[#64748b]">Subtotal</span>
                <span className="text-[16px] font-medium leading-6 tracking-[0.6px] text-[#334155]">{formatMoney(t.subtotal)}</span>
              </div>
              {t.discount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[16px] leading-6 text-[#64748b]">Discount</span>
                  <span className="text-[16px] font-medium leading-6 text-[#059669]">-{formatMoney(t.discount)}</span>
                </div>
              )}
              {t.tax > 0 && (
                <div className="flex items-center justify-between border-t border-[#f1f5f9] pt-3">
                  <span className="text-[16px] leading-6 text-[#64748b]">Tax{t.taxType === "percent" ? ` (${percent(t.taxValue)})` : ""}</span>
                  <span className="text-[16px] font-medium leading-6 text-[#334155]">{formatMoney(t.tax)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[18px] font-bold leading-7 tracking-[-0.1px] text-[#0f172a]">Grand Total</span>
                <span className="text-[24px] font-bold leading-8 tracking-[-0.6px] text-[#059669]">{formatMoney(t.total)}</span>
              </div>
              {t.deposit > 0 && (
                <div className="flex h-10 items-center justify-between rounded-lg border border-[#f1f5f9] bg-[#f8fafc] px-3">
                  <span className="text-[14px] font-medium leading-5 text-[#64748b]">
                    {quote.depositReceived ? "Deposit Received" : "Required Deposit"}
                    {!quote.depositReceived && t.depositType === "percent" ? ` (${percent(t.depositValue)})` : ""}
                  </span>
                  <span className="text-[16px] font-bold leading-6 tracking-[-0.4px] text-[#0f172a]">{formatMoney(quote.depositReceived ?? t.deposit)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes and attachments */}
          {(quote.message || quote.attachments.length > 0) && (
            <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 md:max-w-[578px] md:pt-6">
                {quote.message && (
                  <>
                    <h3 className={sectionHeading}>Notes</h3>
                    <p className="mt-3 whitespace-pre-line text-[14px] italic leading-[22.75px] text-[#64748b]">{quote.message}</p>
                  </>
                )}
              </div>
              {quote.attachments.length > 0 && (
                <section className="w-full shrink-0 rounded-xl border border-[#e2e8f0] bg-white p-6 md:w-[320px] print:hidden">
                  <h3 className={`flex items-center gap-2 ${sectionHeading}`}>
                    <Image src="/portal/attachment.svg" alt="" width={12} height={14} />
                    Attachments
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {quote.attachments.map((f) => (
                      <li key={f.path}>
                        <button
                          type="button"
                          onClick={() => openFile(f.path)}
                          disabled={opening}
                          className="flex min-h-16 w-full items-center justify-between gap-3 rounded-lg border border-[#f1f5f9] bg-[#f8fafc] px-4 py-3 text-left transition-colors hover:border-[#e2e8f0] hover:bg-[#f1f5f9] disabled:cursor-wait"
                        >
                          <span className="flex min-w-0 items-start gap-3">
                            <Image
                              src={/\.pdf$/i.test(f.name) ? "/portal/file-pdf.svg" : "/portal/file-download.svg"}
                              alt=""
                              width={16}
                              height={16}
                              className="mt-0.5 size-4 shrink-0"
                            />
                            <span className="break-all text-[14px] font-medium leading-5 text-[#334155]">{f.name}</span>
                          </span>
                          <Image src="/portal/download.svg" alt={`Download ${f.name}`} width={16} height={16} className="shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {fileError && <p className="mt-3 text-[12px] text-[#dc2626]">{fileError}</p>}
                </section>
              )}
            </div>
          )}

          {/* Terms */}
          {terms.length > 0 && (
            <section className="mt-10">
              <h3 className={`flex items-center gap-2 ${sectionHeading}`}>
                <Image src="/portal/terms.svg" alt="" width={11} height={14} />
                Terms &amp; Conditions
              </h3>
              <ol className="mt-4 space-y-2">
                {terms.map((line, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-[22.75px]">
                    <span className="w-6 shrink-0 font-bold text-[#94a3b8]">{String(i + 1).padStart(2, "0")}.</span>
                    <span className="min-w-0">
                      <TermLine line={line} />
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </article>

      {/* The customer's next step */}
      <div className="fixed inset-x-4 bottom-4 z-40 sm:inset-x-auto sm:bottom-8 sm:right-[33px] print:hidden">
        {state === "awaiting" && (
          <button
            type="button"
            onClick={() => setDialog("approve")}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#10b981] px-6 text-[16px] font-bold leading-6 tracking-[0.4px] text-white shadow-[0_4px_6px_-4px_rgba(16,185,129,0.2),0_10px_15px_-3px_rgba(16,185,129,0.2)] transition-colors hover:bg-[#059669] sm:w-[286px]"
          >
            <Image src="/portal/approve.svg" alt="" width={14} height={14} />
            Approve Quote
          </button>
        )}
        {state === "accepted" && (
          <p className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-[#d1fae5] bg-[#ecfdf5] px-6 text-[16px] font-bold leading-6 text-[#047857] sm:w-[286px]">
            <Image src="/portal/check-small.svg" alt="" width={14} height={10} />
            {quote.acceptedAt ? `Approved ${new Date(quote.acceptedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Quote Approved"}
          </p>
        )}
        {state === "expired" && (
          <p className="rounded-xl border border-[#fef3c7] bg-[#fffbeb] px-5 py-3 text-center text-[14px] font-medium leading-5 text-[#b45309] sm:w-[286px]">
            This quote has expired. Contact {b.name || "the business"} for an updated quote.
          </p>
        )}
      </div>

      <ApproveQuoteModal
        open={dialog === "approve"}
        token={token}
        quote={quote}
        depositDue={depositDue}
        onClose={() => setDialog(null)}
        onAccepted={() => {
          setDialog("accepted");
          router.refresh();
        }}
      />
      <QuoteAcceptedModal open={dialog === "accepted"} onClose={() => setDialog(null)} />
    </div>
  );
}
