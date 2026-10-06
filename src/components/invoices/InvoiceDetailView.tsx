"use client";

import { CalendarDays, Clock, Download, Receipt, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { fileSize, shortDate, shortDay, useLocalTime } from "@/components/jobs/format";
import FileCard from "@/components/jobs/JobFileCard";
import { invoiceFileUrl } from "@/lib/invoices/actions";
import type { InvoiceDetail, InvoiceState } from "@/lib/invoices/data";
import type { JobCustomerOption } from "@/lib/jobs/data";
import { formatMoney } from "@/lib/quotes/totals";
import InvoiceDetailHeader from "./InvoiceDetailHeader";
import type { InvoiceDefaults } from "./InvoiceFormModal";
import InvoiceInternalLogs from "./InvoiceInternalLogs";
import InvoiceItemsCard from "./InvoiceItemsCard";

const card = "flex h-full min-h-[160px] flex-col rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";
const cardLabel = "text-[12px] font-bold uppercase leading-[18px] tracking-[0.6px] text-[#64748b]";

// "Draft / Unsent" is the Figma style; the others follow the same pattern.
const STATUS_PILL: Record<InvoiceState, { label: string; className: string }> = {
  draft: { label: "Draft / Unsent", className: "border-[#ffedd5] bg-[#fff7ed] text-[#ea580c]" },
  sent: { label: "Awaiting Payment", className: "border-[#ffedd5] bg-[#fff7ed] text-[#c2410c]" },
  partially_paid: { label: "Partially Paid", className: "border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]" },
  paid: { label: "Paid", className: "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]" },
  overdue: { label: "Overdue", className: "border-[#fee2e2] bg-[#fef2f2] text-[#b91c1c]" },
  void: { label: "Void", className: "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]" },
  archived: { label: "Archived", className: "border-[#e2e8f0] bg-[#f8fafc] text-[#475569]" },
};

type Event = { at: string; title: string; detail: string; dot: string; tone?: string };

/** The activity timeline, newest first, from what the invoice records. */
function activity(invoice: InvoiceDetail): Event[] {
  const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const source = invoice.quote ? `Created from Quote #${invoice.quote.number}.` : invoice.job ? `Created from Job #${invoice.job.number}.` : "Created manually.";
  const events: Event[] = [{ at: invoice.createdAt, title: "Invoice Created", detail: source, dot: "bg-[#2563eb]" }];
  if (invoice.sentAt) events.push({ at: invoice.sentAt, title: "Invoice Sent", detail: `Sent to ${invoice.customer?.name ?? "the customer"}. Due ${day(invoice.dueOn)}.`, dot: "bg-[#94a3b8]" });
  for (const p of invoice.payments) {
    events.push({
      at: p.createdAt,
      title: "Payment Collected",
      detail: `Manual payment of ${formatMoney(p.amount)} by ${p.method}${p.reference ? ` (${p.reference})` : ""}, received ${day(p.paidOn)}.`,
      dot: "bg-[#2563eb]",
    });
  }
  if (invoice.state === "overdue") {
    events.push({ at: `${invoice.dueOn}T23:59:59Z`, title: "Invoice Overdue", detail: `Payment was due ${day(invoice.dueOn)}.`, dot: "bg-[#f59e0b]", tone: "text-[#b45309]" });
  }
  if (invoice.paidAt) events.push({ at: invoice.paidAt, title: "Invoice Paid", detail: "The balance has been paid in full.", dot: "bg-[#00c185]" });
  if (invoice.voidedAt) events.push({ at: invoice.voidedAt, title: "Invoice Voided", detail: "The invoice was cancelled.", dot: "bg-[#ef4444]", tone: "text-[#ef4444]" });
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

function when(iso: string, local: boolean) {
  const d = new Date(iso);
  const zone = local ? undefined : "UTC";
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: zone })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone })}`;
}

export default function InvoiceDetailView({
  invoice,
  customers,
  defaults,
  openSend,
}: {
  invoice: InvoiceDetail;
  customers: JobCustomerOption[];
  defaults: InvoiceDefaults;
  openSend: boolean;
}) {
  const local = useLocalTime();
  const [fileError, setFileError] = useState<string>();
  const [, startTransition] = useTransition();
  const pill = STATUS_PILL[invoice.state];
  const publicFiles = invoice.attachments.filter((f) => !f.internal);
  const internalFiles = invoice.attachments.filter((f) => f.internal);
  const dateOnly = (d: string) => shortDate(`${d}T00:00:00Z`, false);
  const events = activity(invoice);

  const open = (id: string) =>
    startTransition(async () => {
      const result = await invoiceFileUrl(id);
      if (result.url) window.open(result.url, "_blank", "noopener");
      else setFileError(result.error);
    });

  const chip = (label: string, value: string, href: string) => (
    <Link href={href} className="flex h-[29px] items-center gap-2 rounded-md border border-[#e2e8f0] bg-[#f1f5f9] px-3 text-[11px] leading-[17px] transition-colors hover:border-[#00c185]">
      <span className="font-bold text-[#475569]">{label}</span>
      <span className="truncate text-[#334155]">#{value}</span>
    </Link>
  );

  return (
    <div className="px-4 pb-12 pt-6 sm:pl-[49px] sm:pr-[30px] sm:pt-[19px]">
      <InvoiceDetailHeader invoice={invoice} customers={customers} defaults={defaults} openSend={openSend} />

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${card} justify-between`}>
          <div>
            <p className={cardLabel}>Total Amount</p>
            <p className="mt-1 text-[20px] font-bold leading-[30px] text-[#0f172a]">{formatMoney(invoice.totals.total)}</p>
          </div>
          <div className="mt-3">
            <p className={cardLabel}>Outstanding Balance</p>
            <p className="mt-1 text-[18px] font-bold leading-[27px] text-[#059669]">{formatMoney(invoice.balance)}</p>
            <p className="flex items-center gap-2 text-[13px] leading-5 text-[#475569]">
              <CalendarDays className="size-3.5 text-[#94a3b8]" />
              Due: {dateOnly(invoice.dueOn)}
            </p>
          </div>
        </div>

        <div className={card}>
          <p className={cardLabel}>Customer</p>
          {invoice.customer ? (
            <div className="mt-[11px] min-w-0">
              <Link href={`/customers/${invoice.customerId}`} className="block truncate text-[15px] font-bold leading-[23px] text-[#334155] hover:text-[#00c185]">
                {invoice.customer.name}
              </Link>
              <p className="truncate text-[13px] leading-5 text-[#64748b]">{invoice.customer.phone || "No phone number"}</p>
              <p className="truncate text-[13px] leading-5 text-[#64748b]">{invoice.customer.email || "No email"}</p>
              {invoice.customer.address && <p className="truncate pt-1 text-[12px] leading-[18px] text-[#94a3b8]">{invoice.customer.address}</p>}
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-[#94a3b8]">Customer not found.</p>
          )}
        </div>

        <div className={card}>
          <p className={cardLabel}>Linked Records</p>
          <div className="mt-3 flex flex-col gap-2">
            {invoice.job && chip("JOB:", invoice.job.number, `/jobs/${invoice.job.id}`)}
            {invoice.quote && chip("QUOTE:", invoice.quote.number, `/quotes/${invoice.quote.id}`)}
            {!invoice.job && !invoice.quote && <p className="text-[11px] leading-[17px] text-[#64748b]">No job or quote linked</p>}
            <p className="flex items-center gap-2 px-1 text-[11px] leading-[17px] text-[#64748b]">
              <Receipt className="size-3 text-[#94a3b8]" />
              {invoice.payments.length
                ? `${invoice.payments.length} payment${invoice.payments.length === 1 ? "" : "s"} recorded`
                : "No payments linked"}
            </p>
          </div>
        </div>

        <div className={`${card} justify-between`}>
          <div>
            <p className={cardLabel}>Status</p>
            <span className={`mt-2.5 inline-flex rounded-full border px-3 text-[12px] font-bold uppercase leading-[18px] ${pill.className}`}>{pill.label}</span>
          </div>
          <p className="flex items-center gap-2 text-[13px] leading-5 text-[#64748b]">
            <Clock className="size-3.5 text-[#94a3b8]" />
            Created: {shortDate(invoice.createdAt, local)}
          </p>
        </div>
      </div>

      <InvoiceItemsCard key={invoice.updatedAt} invoice={invoice} />

      <section className="mt-6 rounded-2xl border border-[#f1f5f9] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center border-b border-[#f8fafc] p-6">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#f0fdfa]">
            <UserRoundCheck className="size-[17px] text-[#00c38b]" />
          </span>
          <h3 className="ml-3 text-[18px] font-bold leading-7 tracking-[-0.2px] text-[#0a1b2f]">Customer-Facing Information</h3>
        </div>
        <div className="grid grid-cols-1 gap-8 px-6 pb-10 pt-6 lg:grid-cols-[minmax(0,460fr)_minmax(0,469fr)] lg:gap-[62px]">
          <div>
            <h4 className="text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#64748b]">Customer Message</h4>
            <div className="mt-4 min-h-[230px] whitespace-pre-line rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-6 text-[16px] leading-[26px] text-[#0a1b2f]">
              {invoice.message || <span className="text-[#94a3b8]">No message for the customer.</span>}
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
        <p className="mt-[15px] whitespace-pre-line text-[14px] leading-[23px] text-[#475569]">
          {invoice.terms || <span className="text-[#94a3b8]">No terms on this invoice.</span>}
        </p>
      </div>

      <InvoiceInternalLogs key={`notes-${invoice.updatedAt}`} invoiceId={invoice.id} notes={invoice.internalNotes ?? ""} files={internalFiles} />

      <section className="mt-[26px] rounded-2xl border border-[#f1f5f9] bg-white px-6 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:px-10 print:hidden">
        <h3 className="text-[18px] font-bold leading-[27px] text-[#0f172a]">Invoice Activity</h3>
        <ol className="relative mt-6 ml-[5px] flex flex-col gap-8 border-l-2 border-[#e2e8f0] pl-8">
          {events.map((e, i) => (
            <li key={`${e.title}-${i}`} className="relative flex flex-col justify-between gap-1 sm:flex-row sm:gap-6">
              <span className={`absolute -left-[39px] top-1.5 size-3 rounded-full shadow-[0_0_0_4px_#fff,0_1px_2px_rgba(0,0,0,0.05)] ${e.dot}`} />
              <div className="min-w-0">
                <h4 className={`text-[15px] font-bold leading-[23px] ${e.tone ?? "text-[#0f172a]"}`}>{e.title}</h4>
                <p className="text-[14px] leading-[21px] text-[#64748b]">{e.detail}</p>
              </div>
              <span className="shrink-0 text-[12px] font-medium leading-[18px] text-[#94a3b8]">{when(e.at, local)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
