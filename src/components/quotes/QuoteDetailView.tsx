"use client";

import { BriefcaseBusiness, Download, Mail, Phone, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { fileSize, shortDate, shortDay, useLocalTime } from "@/components/jobs/format";
import FileCard from "@/components/jobs/JobFileCard";
import type { JobCustomerOption } from "@/lib/jobs/data";
import { quoteFileUrl } from "@/lib/quotes/actions";
import type { QuoteDetail } from "@/lib/quotes/data";
import { formatMoney } from "@/lib/quotes/totals";
import QuoteDetailHeader from "./QuoteDetailHeader";
import type { QuoteDefaults } from "./QuoteFormModal";
import QuoteInternalLogs from "./QuoteInternalLogs";
import QuoteItemsCard from "./QuoteItemsCard";

const card = "rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";
const cardLabel = "text-[12px] font-semibold uppercase leading-4 text-[#94a3b8]";

// "Awaiting approval" is the Figma style; the others follow the same pattern.
const STATUS_PILL: Record<QuoteDetail["state"], { label: string; bg: string; dot: string; text: string }> = {
  draft: { label: "DRAFT", bg: "bg-[#f1f5f9]", dot: "bg-[#94a3b8]", text: "text-[#475569]" },
  sent: { label: "AWAITING APPROVAL", bg: "bg-[#ffedd5]", dot: "bg-[#f97316]", text: "text-[#c2410c]" },
  accepted: { label: "ACCEPTED", bg: "bg-[#dcfce7]", dot: "bg-[#22c55e]", text: "text-[#15803d]" },
  declined: { label: "DECLINED", bg: "bg-[#fee2e2]", dot: "bg-[#ef4444]", text: "text-[#b91c1c]" },
  archived: { label: "ARCHIVED", bg: "bg-[#f1f5f9]", dot: "bg-[#94a3b8]", text: "text-[#475569]" },
};

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function relative(iso: string, now: number) {
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[14px] leading-5 text-[#64748b]">{label}</span>
      <span className="text-right text-[14px] font-medium leading-5 text-[#0f172a]">{children}</span>
    </div>
  );
}

export default function QuoteDetailView({
  quote,
  customers,
  defaults,
  now,
  openSend,
}: {
  quote: QuoteDetail;
  customers: JobCustomerOption[];
  defaults: QuoteDefaults;
  now: number;
  openSend: boolean;
}) {
  const local = useLocalTime();
  const [fileError, setFileError] = useState<string>();
  const [, startTransition] = useTransition();
  const pill = STATUS_PILL[quote.state];
  const publicFiles = quote.attachments.filter((f) => !f.internal);
  const internalFiles = quote.attachments.filter((f) => f.internal);
  const dateOnly = (d: string | null) => (d ? shortDate(`${d}T00:00:00Z`, false) : "—");

  const open = (id: string) =>
    startTransition(async () => {
      const result = await quoteFileUrl(id);
      if (result.url) window.open(result.url, "_blank", "noopener");
      else setFileError(result.error);
    });

  return (
    <div className="px-4 pb-12 pt-6 sm:pl-[49px] sm:pr-[30px] sm:pt-[19px]">
      <QuoteDetailHeader quote={quote} customers={customers} defaults={defaults} openSend={openSend} />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className={card}>
          <p className={cardLabel}>Quote</p>
          <div className="mt-[5px] flex flex-col gap-0">
            <Meta label="Total:">
              <span className="text-[14px] font-extrabold leading-8 text-[#0a1b33]">{formatMoney(quote.totals.total)}</span>
            </Meta>
            <Meta label="Required Deposit:">
              <span className="font-bold text-[#0a1b33]">{formatMoney(quote.totals.deposit)}</span>
            </Meta>
            <Meta label="Created Date:">{shortDate(quote.createdAt, local)}</Meta>
            <Meta label="Sent Date:">{quote.sentAt ? shortDate(quote.sentAt, local) : "—"}</Meta>
            <Meta label="Expire Date:">{dateOnly(quote.expiresOn)}</Meta>
          </div>
        </div>

        <div className={card}>
          <p className={cardLabel}>Customer</p>
          {quote.customer ? (
            <>
              <div className="mt-5 flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0f172a] text-[13px] font-bold text-white">{initials(quote.customer.name)}</span>
                <div className="min-w-0">
                  <Link href={`/customers/${quote.customerId}`} className="line-clamp-2 text-[14px] font-bold leading-5 text-[#0f172a] hover:text-[#00c185]">
                    {quote.customer.name}
                  </Link>
                  <p className="flex items-center gap-1.5 truncate text-[12px] leading-4 text-[#64748b]">
                    <Mail className="size-3 shrink-0" />
                    {quote.customer.email || "No email"}
                  </p>
                </div>
              </div>
              <p className="mt-6 flex items-center gap-2 text-[12px] leading-4 text-[#64748b]">
                <Phone className="size-3 text-[#64748b]" />
                {quote.customer.phone || "No phone number"}
              </p>
            </>
          ) : (
            <p className="mt-5 text-[14px] text-[#94a3b8]">Customer not found.</p>
          )}
        </div>

        <div className={card}>
          <p className={cardLabel}>Linked Job</p>
          <div className="mt-3 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9]">
              <BriefcaseBusiness className="size-4 text-[#94a3b8]" />
            </span>
            {quote.job ? (
              <div className="min-w-0">
                <Link href={`/jobs/${quote.job.id}`} className="text-[14px] font-bold leading-5 text-[#0f172a] hover:text-[#00c185]">
                  {quote.job.number}
                </Link>
                <p className="truncate text-[12px] leading-4 text-[#64748b]" title={quote.job.title}>{quote.job.title}</p>
              </div>
            ) : (
              <div>
                <p className="text-[14px] font-bold italic leading-5 text-[#0f172a]">Not Linked Yet</p>
                <p className="text-[12px] leading-4 text-[#64748b]">{quote.status === "accepted" ? "Ready to convert to a job" : "Pending conversion"}</p>
              </div>
            )}
          </div>
        </div>

        <div className={card}>
          <p className={cardLabel}>Current Status</p>
          <span className={`mt-2 inline-flex h-7 items-center gap-2 rounded-full px-3 ${pill.bg}`}>
            <span className={`size-2 rounded-full ${pill.dot}`} />
            <span className={`text-[14px] font-bold leading-5 ${pill.text}`}>{pill.label}</span>
          </span>
          <p className="mt-4 text-[11px] italic leading-[17px] text-[#94a3b8]">Last activity: {relative(quote.updatedAt, now)}</p>
        </div>
      </div>

      <QuoteItemsCard key={quote.updatedAt} quote={quote} />

      <section className="mt-[31px] rounded-2xl border border-[#f1f5f9] bg-white px-6 pb-12 pt-6 lg:px-[30px]">
        <div className="flex items-center justify-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#f0fdfa]">
            <UserRoundCheck className="size-[17px] text-[#00c38b]" />
          </span>
          <h3 className="text-[18px] font-bold leading-7 text-[#0a1b2f]">Customer-Facing Information</h3>
        </div>
        <div className="mt-[61px] grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,528fr)_minmax(0,469fr)] lg:gap-[62px] lg:pl-[22px]">
          <div>
            <h4 className="text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#64748b]">Customer Message</h4>
            <div className="mt-4 min-h-[230px] whitespace-pre-line rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-6 text-[16px] leading-[26px] text-[#0a1b2f]">
              {quote.message || <span className="text-[#94a3b8]">No message for the customer.</span>}
            </div>
          </div>
          <div>
            <h4 className="text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#64748b]">Attachments</h4>
            <ul className="mt-4 flex flex-col gap-3">
              {publicFiles.map((f) => (
                <FileCard
                  key={f.id}
                  name={f.name}
                  type={f.contentType}
                  meta={[fileSize(f.sizeBytes), shortDay(f.createdAt)].filter(Boolean).join(" • ")}
                  action={
                    <button type="button" onClick={() => open(f.id)} aria-label={`Download ${f.name}`} className="rounded p-1 text-[#cbd5e1] transition-colors hover:text-[#475569]">
                      <Download className="size-4" />
                    </button>
                  }
                />
              ))}
              {publicFiles.length === 0 && (
                <li className="flex h-[74px] items-center justify-center rounded-xl border border-dashed border-[#e2e8f0] bg-white text-[14px] text-[#94a3b8]">
                  No files for the customer. Add them with Edit.
                </li>
              )}
            </ul>
            {fileError && <p role="alert" className="mt-3 text-[12px] text-[#ef4444]">{fileError}</p>}
          </div>
        </div>
      </section>

      <div className="mt-[25px] rounded-3xl border border-[#f3f4f6] bg-white px-8 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <h3 className="text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#9ca3af]">Terms and Conditions</h3>
        <p className="mt-[15px] whitespace-pre-line text-[14px] leading-[22.8px] text-[#475569]">
          {quote.terms || <span className="text-[#94a3b8]">No terms on this quote.</span>}
        </p>
      </div>

      <QuoteInternalLogs key={`notes-${quote.updatedAt}`} quoteId={quote.id} notes={quote.internalNotes ?? ""} files={internalFiles} />
    </div>
  );
}
