"use client";

import { CalendarDays, CircleCheck, Download, ExternalLink, Link2, Mail, Phone, UserRound, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { jobFileUrl } from "@/lib/jobs/actions";
import { jobStatusLabel, type JobCustomerOption, type JobDetail, type JobStatus } from "@/lib/jobs/data";
import { formatMoney } from "@/lib/quotes/totals";
import { fileSize, shortDate, shortDay, useLocalTime } from "./format";
import JobDetailHeader from "./JobDetailHeader";
import JobFileCard from "./JobFileCard";
import JobInternalLogs from "./JobInternalLogs";
import JobItemsCard from "./JobItemsCard";

const card = "rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

// "In Progress" is the Figma style; the others follow the same pattern.
const STATUS_PILL: Record<JobStatus, { bg: string; dot: string; text: string }> = {
  unscheduled: { bg: "bg-[#f1f5f9]", dot: "bg-[#94a3b8]", text: "text-[#475569]" },
  scheduled: { bg: "bg-[#fef3c7]", dot: "bg-[#f59e0b]", text: "text-[#92400e]" },
  in_progress: { bg: "bg-[#2dd4bf]/20", dot: "bg-[#2dd4bf]", text: "text-[#115e59]" },
  completed: { bg: "bg-[#dcfce7]", dot: "bg-[#22c55e]", text: "text-[#166534]" },
};

const QUOTE_PILL: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-[#f1f5f9] text-[#475569]" },
  sent: { label: "Pending", className: "bg-[#fffbeb] text-[#b45309]" },
  accepted: { label: "Approved", className: "bg-[#eff6ff] text-[#1d4ed8]" },
  declined: { label: "Declined", className: "bg-[#fef2f2] text-[#b91c1c]" },
};

function CardHead({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2dd4bf]/10 text-[#2dd4bf]">{icon}</span>
      <h3 className="text-[14px] font-medium leading-[21px] text-[#64748b]">{title}</h3>
    </div>
  );
}

function LinkedRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-[45px] items-center justify-between rounded-lg bg-[#f8fafc] px-3">
      <span className="text-[14px] font-medium leading-[21px] text-[#475569]">{label}</span>
      {children}
    </div>
  );
}

function RefTable({ title, count, columns, empty, children }: { title: string; count: string; columns: string[]; empty: string; children?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex h-16 items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc]/50 px-8">
        <h3 className="text-[16px] font-bold leading-6 text-[#0f172a]">{title}</h3>
        <span className="text-[12px] font-bold uppercase leading-4 text-[#94a3b8]">{count}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed text-left">
          <thead className="text-[12px] font-bold uppercase leading-4 text-[#64748b]">
            <tr className="h-12">
              <th className="w-[26.5%] pl-8">{columns[0]}</th>
              <th className="w-[26.5%] pl-8">{columns[1]}</th>
              <th className="w-[23.8%] pr-8 text-right">{columns[2]}</th>
              <th className="text-center">{columns[3]}</th>
            </tr>
          </thead>
          <tbody>
            {children ?? (
              <tr>
                <td colSpan={4} className="px-8 pb-6 pt-2 text-center text-[14px] text-[#94a3b8]">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
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

/** What last happened to the job, from the fields we keep. */
function latestActivity(job: JobDetail, local: boolean) {
  if (job.archived) return "This job is archived.";
  if (job.status === "completed") return "Job marked as completed.";
  if (job.status === "in_progress") return "Work on this job is in progress.";
  if (job.sentAt) return "Job details sent to the customer.";
  if (job.status === "scheduled" && job.startsAt) return `Job scheduled to start ${shortDate(job.startsAt, local)}.`;
  return "Job created and waiting to be scheduled.";
}

export default function JobDetailView({
  job,
  customers,
  defaultTerms,
  now,
}: {
  job: JobDetail;
  customers: JobCustomerOption[];
  defaultTerms: string;
  now: number;
}) {
  const local = useLocalTime();
  const [fileError, setFileError] = useState<string>();
  const [, startTransition] = useTransition();
  const status = STATUS_PILL[job.status];
  const publicFiles = job.attachments.filter((f) => !f.internal);
  const internalFiles = job.attachments.filter((f) => f.internal);
  const quotePill = job.quote ? (QUOTE_PILL[job.quote.status] ?? QUOTE_PILL.draft) : null;
  const day = (iso: string | null) => (iso ? shortDate(iso, local) : "—");

  const open = (id: string) =>
    startTransition(async () => {
      const result = await jobFileUrl(id);
      if (result.url) window.open(result.url, "_blank", "noopener");
      else setFileError(result.error);
    });

  return (
    <div className="px-4 pb-12 pt-6 sm:pl-10 sm:pr-[39px] sm:pt-[31px]">
      <JobDetailHeader job={job} customers={customers} defaultTerms={defaultTerms} />

      <div className="mt-[22px] grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-[38px]">
        <div className={card}>
          <CardHead icon={<CalendarDays className="size-4" />} title="Job Summary" />
          <p className="mt-6 text-[12px] leading-[18px] text-[#94a3b8]">Total Amount</p>
          <p className="text-[24px] font-bold leading-9 text-[#0f172a]">{formatMoney(job.totals.total)}</p>
          <p className="mt-1 truncate text-[14px] text-[#475569]" title={job.title}>{job.title}</p>
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-[#f1f5f9] pt-[15px]">
            {[
              ["Created", job.createdAt],
              ["Start", job.startsAt],
              ["End", job.endsAt],
            ].map(([label, iso]) => (
              <div key={label}>
                <p className="text-[11px] uppercase leading-[17px] text-[#94a3b8]">{label}</p>
                <p className="text-[14px] font-semibold leading-[21px] text-[#475569]">{day(iso)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <CardHead icon={<UserRound className="size-4" />} title="Customer Information" />
          {job.customer ? (
            <>
              <Link href={`/customers/${job.customerId}`} className="mt-6 block truncate text-[18px] font-bold leading-[27px] text-[#0f172a] hover:text-[#00c185]">
                {job.customer.name}
              </Link>
              <p className="mt-3 flex items-center gap-2 text-[14px] leading-[21px] text-[#475569]">
                <Phone className="size-3 text-[#94a3b8]" />
                {job.customer.phone || "No phone number"}
              </p>
              <p className="mt-3 flex items-center gap-2 truncate text-[14px] leading-[21px] text-[#475569]">
                <Mail className="size-3 text-[#94a3b8]" />
                {job.customer.email || "No email address"}
              </p>
            </>
          ) : (
            <p className="mt-6 text-[14px] text-[#94a3b8]">Customer not found.</p>
          )}
        </div>

        <div className={card}>
          <CardHead icon={<Link2 className="size-4" />} title="Linked Records" />
          <div className="mt-6 flex flex-col gap-3">
            <LinkedRow label="Linked Quote">
              {job.quote ? (
                <Link href={`/quotes/${job.quote.id}`} className="flex items-center gap-2 text-[12px] font-semibold text-[#2dd4bf] hover:text-[#14b8a6]">
                  {job.quote.number}
                  <ExternalLink className="size-2.5" />
                </Link>
              ) : (
                <span className="text-[12px] text-[#94a3b8]">—</span>
              )}
            </LinkedRow>
            {/* Invoices and payments link here once they're built. */}
            <LinkedRow label="Linked Invoice">
              <span className="text-[12px] text-[#94a3b8]">—</span>
            </LinkedRow>
            <LinkedRow label="Linked Payment">
              <span className="rounded bg-[#f1f5f9] px-2 py-1 text-[10px] font-bold uppercase text-[#64748b]">None</span>
            </LinkedRow>
          </div>
        </div>

        <div className={card}>
          <CardHead icon={<CircleCheck className="size-4" />} title="Current Status" />
          <span className={`mt-6 inline-flex h-10 items-center gap-2 rounded-full px-4 ${status.bg}`}>
            <span className={`size-2.5 rounded-full ${status.dot}`} />
            <span className={`text-[16px] font-bold leading-6 ${status.text}`}>{jobStatusLabel(job.status)}</span>
          </span>
          <p className="mt-4 text-[12px] leading-[18px] text-[#94a3b8]">Latest Activity</p>
          <p className="mt-1 text-[14px] leading-[21px] text-[#475569]">{latestActivity(job, local)}</p>
          <p className="mt-1 text-[11px] italic leading-[17px] text-[#94a3b8]">
            Last updated: {relative(job.updatedAt, now)}
          </p>
        </div>
      </div>

      <JobItemsCard key={job.updatedAt} job={job} />

      <div className="mt-[31px] flex h-20 items-center justify-center gap-3 border-b border-[#f8fafc]">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#f0fdfa]">
          <UserRoundCheck className="size-[17px] text-[#00c38b]" />
        </span>
        <h3 className="text-[18px] font-bold leading-7 text-[#0a1b2f]">Customer-Facing Information</h3>
      </div>

      <div className="mt-[19px] grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,527fr)_minmax(0,469fr)] lg:gap-[29px] lg:px-[55px]">
        <div>
          <h4 className="text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#64748b]">Customer Message</h4>
          <div className="mt-4 min-h-[230px] whitespace-pre-line rounded-xl border border-[#f1f5f9] bg-[#f8fafc] p-6 text-[16px] leading-[26px] text-[#0a1b2f]">
            {job.notes || <span className="text-[#94a3b8]">No message for the customer.</span>}
          </div>
        </div>
        <div>
          <h4 className="text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#64748b]">Attachments</h4>
          <ul className="mt-4 flex flex-col gap-3">
            {publicFiles.map((f) => (
              <JobFileCard
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
                No files shared with the customer.
              </li>
            )}
          </ul>
          {fileError && <p role="alert" className="mt-3 text-[12px] text-[#ef4444]">{fileError}</p>}
        </div>
      </div>

      <div className="mt-[52px] rounded-3xl border border-[#f3f4f6] bg-white px-8 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] lg:-mx-4">
        <h3 className="text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-[#9ca3af]">Terms and Conditions</h3>
        <p className="mt-[15px] whitespace-pre-line text-[14px] leading-[22.8px] text-[#475569]">
          {job.terms || <span className="text-[#94a3b8]">No terms on this job.</span>}
        </p>
      </div>

      <JobInternalLogs key={job.updatedAt} jobId={job.id} notes={job.internalNotes ?? ""} files={internalFiles} />

      <div className="mt-[17px] flex flex-col gap-[6px]">
        <RefTable
          title="Linked Quote"
          count={`${job.quote ? 1 : 0} Record${job.quote ? "" : "s"}`}
          columns={["Quote ID", "Issue Date", "Amount", "Status"]}
          empty="No quote linked to this job."
        >
          {job.quote && quotePill && (
            <tr className="h-[60px]">
              <td className="pl-8 text-[16px] font-semibold text-[#2dd4bf]">
                <Link href={`/quotes/${job.quote.id}`} className="hover:text-[#14b8a6]">{job.quote.number}</Link>
              </td>
              <td className="pl-8 text-[16px] text-[#475569]">{shortDate(job.quote.date, false)}</td>
              <td className="pr-8 text-right text-[16px] font-bold text-[#0f172a]">{formatMoney(job.quote.total)}</td>
              <td className="text-center">
                <span className={`inline-flex h-[23px] items-center rounded-full px-3 text-[12px] font-bold ${quotePill.className}`}>{quotePill.label}</span>
              </td>
            </tr>
          )}
        </RefTable>
        <RefTable title="Linked Invoice" count="0 References" columns={["Invoice ID", "Due Date", "Amount", "Status"]} empty="No invoices for this job yet." />
        <RefTable title="Linked Payment" count="0 References" columns={["Transaction ID", "Method", "Amount", "Date"]} empty="No payments recorded for this job yet." />
      </div>
    </div>
  );
}
