import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CustomerDetail as Customer, CustomerQuote } from "@/lib/customers/data";
import { ACTIVE_JOB_STATUSES, jobStatusLabel } from "@/lib/jobs/data";
import { formatMoney } from "@/lib/quotes/totals";
import CustomerFiles from "./CustomerFiles";
import CustomerHeader from "./CustomerHeader";

const cardClass =
  "h-[146px] rounded-xl border border-[#e2e8f0] bg-white p-[23px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const QUOTE_DOT: Record<string, string> = {
  draft: "bg-[#94a3b8]",
  sent: "bg-[#f59e0b]",
  accepted: "bg-[#10b981]",
  declined: "bg-[#ef4444]",
};
const QUOTE_LABEL: Record<string, string> = { draft: "Draft", sent: "Sent", accepted: "Accepted", declined: "Declined" };

const JOB_DOT: Record<string, string> = {
  unscheduled: "bg-[#94a3b8]",
  scheduled: "bg-[#f59e0b]",
  in_progress: "bg-[#3b82f6]",
  completed: "bg-[#10b981]",
};

function InfoCard({ icon, iconBg, w, title, children }: { icon: string; iconBg: string; w: number; title: string; children: ReactNode }) {
  return (
    <div className={cardClass}>
      <div className="flex items-center gap-3">
        <span className={`flex size-8 items-center justify-center rounded ${iconBg}`}>
          <Image src={`/customers/${icon}.svg`} alt="" width={w} height={14} />
        </span>
        <h3 className="text-[16px] font-bold leading-6 tracking-[-0.25px] text-[#0f172a]">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function HistorySection({
  title,
  badge,
  badgeClass,
  empty,
  children,
}: {
  title: string;
  badge: string;
  badgeClass: string;
  empty: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-[#e2e8f0] p-6 last:border-b-0 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[18px] font-bold leading-[27px] text-[#1e293b]">{title}</h3>
        <span className={`rounded-full px-2.5 text-[12px] font-medium leading-[22px] ${badgeClass}`}>{badge}</span>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {children ?? (
          <p className="rounded-lg border border-dashed border-[#e2e8f0] px-4 py-6 text-center text-[14px] text-[#94a3b8]">{empty}</p>
        )}
      </div>
    </section>
  );
}

function HistoryRow({ dot, title, subtitle, amount, href }: { dot: string; title: string; subtitle: string; amount: number; href: string }) {
  return (
    <Link href={href} className="flex min-h-[74px] items-center justify-between gap-4 rounded-lg border border-[#f1f5f9] bg-[#f8fafc] px-[15px] py-3 transition-colors hover:border-[#e2e8f0] hover:bg-white">
      <div className="flex min-w-0 items-center gap-4">
        <span className={`size-2.5 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-[22.5px] text-[#334155]">{title}</p>
          <p className="truncate text-[13px] leading-[19.5px] text-[#64748b]">{subtitle}</p>
        </div>
      </div>
      <p className="shrink-0 pr-[18px] text-[14px] font-medium leading-[21px] text-[#475569]">{formatMoney(amount)}</p>
    </Link>
  );
}

function quoteSubtitle(q: CustomerQuote) {
  const parts = [`Quote #${q.number}`, QUOTE_LABEL[q.status] ?? q.status];
  if (q.status === "sent" && q.expiresOn) parts.push(`Expires ${longDate(q.expiresOn)}`);
  else parts.push(`Created ${longDate(q.createdAt)}`);
  return parts.join(" • ");
}

export default function CustomerDetail({ customer }: { customer: Customer }) {
  const pendingQuotes = customer.quotes.filter((q) => q.status === "sent").length;
  const activeJobs = customer.jobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status)).length;

  return (
    <div className="px-4 pb-12 pt-6 sm:pl-[45px] sm:pr-8 sm:pt-5">
      <CustomerHeader
        id={customer.id}
        name={customer.name}
        archived={customer.archived}
        values={{
          name: customer.name,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          streetAddress: customer.address ?? "",
          notes: customer.notes ?? "",
        }}
      />

      <div className="mt-[39px] grid grid-cols-1 gap-6 sm:-ml-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon="contact" iconBg="bg-[#eff6ff]" w={12} title="Contact Info">
          <p className="truncate text-[14px] leading-[21px] text-[#64748b]">
            Email: <span className="font-medium text-[#334155]">{customer.email || "—"}</span>
          </p>
          <p className="mt-2 truncate text-[14px] leading-[21px] text-[#64748b]">
            Phone: <span className="font-medium text-[#334155]">{customer.phone || "—"}</span>
          </p>
        </InfoCard>
        <InfoCard icon="address" iconBg="bg-[#dcfce7]" w={11} title="Address">
          <p className="line-clamp-3 whitespace-pre-line text-[14px] font-medium leading-5 text-[#334155]">
            {customer.address || <span className="font-normal text-[#94a3b8]">No address</span>}
          </p>
        </InfoCard>
        <InfoCard icon="notes" iconBg="bg-[#fef3c7]" w={12} title="Notes">
          <p className="line-clamp-3 whitespace-pre-line text-[14px] italic leading-[21px] text-[#64748b]">
            {customer.notes || "No notes"}
          </p>
        </InfoCard>
        <CustomerFiles customerId={customer.id} attachments={customer.attachments} cardClass={cardClass} />
      </div>

      <div className="mt-[18px] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:-ml-3">
        <HistorySection
          title="Job History"
          badge={`${activeJobs} Active Job${activeJobs === 1 ? "" : "s"}`}
          badgeClass="bg-[#eff6ff] text-[#1d4ed8]"
          empty="No jobs yet."
        >
          {customer.jobs.length > 0 &&
            customer.jobs.map((j) => (
              <HistoryRow
                key={j.id}
                href={`/jobs/${j.id}`}
                dot={JOB_DOT[j.status] ?? "bg-[#94a3b8]"}
                title={j.title}
                subtitle={[
                  `Job #${j.number}`,
                  jobStatusLabel(j.status),
                  j.startsAt ? `Starts ${longDate(j.startsAt)}` : `Created ${longDate(j.createdAt)}`,
                ].join(" • ")}
                amount={j.total}
              />
            ))}
        </HistorySection>
        <HistorySection
          title="Quote History"
          badge={pendingQuotes ? `${pendingQuotes} Pending Approval` : `${customer.quotes.length} Quote${customer.quotes.length === 1 ? "" : "s"}`}
          badgeClass="bg-[#fffbeb] text-[#b45309]"
          empty="No quotes yet."
        >
          {customer.quotes.length > 0 &&
            customer.quotes.map((q) => (
              <HistoryRow
                key={q.id}
                href={`/quotes/${q.id}`}
                dot={QUOTE_DOT[q.status] ?? "bg-[#94a3b8]"}
                title={q.title || `Quote ${q.number}`}
                subtitle={quoteSubtitle(q)}
                amount={q.total}
              />
            ))}
        </HistorySection>
        <HistorySection title="Invoice History" badge="0 Past Invoices" badgeClass="bg-[#f8fafc] text-[#64748b]" empty="No invoices yet." />
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:-ml-3">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-4">
          <h3 className="text-[16px] font-bold text-[#0f172a]">Payment History</h3>
          <span className="rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-2.5 text-[12px] font-medium leading-[22px] text-[#7c3aed]">
            0 Payments Logged
          </span>
        </div>
        <p className="px-6 py-8 text-center text-[14px] text-[#94a3b8]">No payments recorded yet.</p>
      </section>
    </div>
  );
}
