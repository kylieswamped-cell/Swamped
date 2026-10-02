"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Chip, FilterMenu } from "@/components/dashboard/FilterMenu";
import { shortDate, useLocalTime } from "@/components/jobs/format";
import type { JobCustomerOption } from "@/lib/jobs/data";
import { QUOTE_FILTERS, type QuoteRow, type QuoteState, type QuoteStats } from "@/lib/quotes/data";
import { formatMoney } from "@/lib/quotes/totals";
import QuoteFormModal, { type QuoteDefaults } from "./QuoteFormModal";
import QuoteStatusBadge from "./QuoteStatusBadge";

const DAY = 24 * 60 * 60 * 1000;
const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

const inRange = (iso: string | null, days: string, now: number) =>
  !days || Boolean(iso && new Date(iso).getTime() >= now - Number(days) * DAY);

const statCard = "h-[113px] rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

export default function QuotesView({
  quotes,
  stats,
  now,
  customers,
  defaults,
  openNew,
  newForCustomer,
}: {
  quotes: QuoteRow[];
  stats: QuoteStats;
  now: number;
  customers: JobCustomerOption[];
  defaults: QuoteDefaults;
  openNew: boolean;
  newForCustomer?: string;
}) {
  const router = useRouter();
  const local = useLocalTime();
  const [query, setQuery] = useState("");
  const [states, setStates] = useState<QuoteState[]>([]);
  const [created, setCreated] = useState("");
  const [sent, setSent] = useState("");
  const [creating, setCreating] = useState(openNew);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const single = (current: string, value: string) => (current === value ? "" : value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[$,]/g, "");
    return quotes.filter((row) => {
      // Archived quotes stay out of the way unless asked for.
      if (states.length ? !states.includes(row.state) : row.state === "archived") return false;
      if (!inRange(row.createdAt, created, now) || !inRange(row.sentAt, sent, now)) return false;
      if (!q) return true;
      return [row.number, row.customer, row.title, row.total.toFixed(2), row.job?.number].some((v) => v?.toLowerCase().includes(q));
    });
  }, [quotes, query, states, created, sent, now]);

  const rangeLabel = (v: string) => RANGES.find((r) => r.value === v)?.label ?? "";
  const chips = [
    ...states.map((s) => ({ key: s, label: `Status: ${QUOTE_FILTERS.find((o) => o.value === s)?.label}`, remove: () => setStates(toggle(states, s)) })),
    ...(created ? [{ key: "c", label: `Created: ${rangeLabel(created)}`, remove: () => setCreated("") }] : []),
    ...(sent ? [{ key: "s", label: `Sent: ${rangeLabel(sent)}`, remove: () => setSent("") }] : []),
  ];
  const filtering = Boolean(query) || chips.length > 0;

  const cards = [
    { label: "Draft Quotes (Last 30 days)", value: String(stats.drafts30d) },
    { label: "Sent Quotes (Last 30 days)", value: String(stats.sent30d) },
    { label: "Approved Quotes (Last 30 days)", value: String(stats.approved30d) },
    { label: "Close % (Last 30 days)", value: stats.closeRate === null ? "—" : `${stats.closeRate.toFixed(1)}%` },
  ];
  const day = (iso: string | null) => (iso ? shortDate(iso, local) : "—");
  // expires_on is a plain date; show it as written.
  const dateOnly = (d: string | null) => (d ? shortDate(`${d}T00:00:00Z`, false) : "—");

  const closeNew = () => {
    setCreating(false);
    if (openNew) router.replace("/quotes", { scroll: false });
  };

  return (
    <div className="px-4 pb-12 pt-6 sm:px-10 sm:pt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {cards.map((c) => (
          <div key={c.label} className={statCard}>
            <p className="truncate text-[14px] font-medium leading-[21px] text-[#64748b]">{c.label}</p>
            <p className="mt-2 text-[24px] font-bold leading-9 text-[#0f172a]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#e2e8f0] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] xl:h-[83px] xl:flex-row xl:items-center xl:gap-0 xl:py-0">
        <label className="relative min-w-0 xl:w-[358px] xl:shrink-0">
          <span className="sr-only">Search quotes</span>
          <Image src="/onboarding/search.svg" alt="" width={17} height={16} className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, customer or amount..."
            className="h-[37px] w-full rounded-lg border border-[#e5e7eb] bg-[#f9fafb] pl-10 pr-3 text-[14px] text-[#0f172a] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#00c185]"
          />
        </label>
        <div className="flex flex-wrap gap-[13px] xl:ml-[7px]">
          <FilterMenu label="Status" options={QUOTE_FILTERS} selected={states} onToggle={(v) => setStates(toggle(states, v))} width="w-[93px]" />
          <FilterMenu label="Created Date" options={RANGES} selected={created ? [created] : []} onToggle={(v) => setCreated(single(created, v))} width="w-[139px]" />
          <FilterMenu label="Sent Date" options={RANGES} selected={sent ? [sent] : []} onToggle={(v) => setSent(single(sent, v))} width="w-[118px]" />
        </div>
        <button
          type="button"
          onClick={() => (customers.length ? setCreating(true) : router.push("/customers?new=1"))}
          className="flex h-[51px] items-center justify-center gap-2 rounded-lg bg-[#00c185] px-5 text-[16px] font-semibold leading-6 text-white transition-colors hover:bg-[#00a873] xl:ml-auto xl:w-[174px] xl:px-0"
        >
          <span className="text-[18px] font-bold leading-[27px]">+</span>
          Create New Quote
        </button>
      </div>

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {chips.map((c) => (
            <Chip key={c.key} label={c.label} onRemove={c.remove} />
          ))}
          <button
            type="button"
            onClick={() => {
              setStates([]);
              setCreated("");
              setSent("");
            }}
            className="ml-2 text-[12px] font-medium leading-4 text-[#94a3b8] hover:text-[#475569]"
          >
            Clear All
          </button>
        </div>
      )}

      <section className={`${chips.length ? "mt-[23px]" : "mt-[38px]"} overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]`}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <h2 className="text-[16px] font-bold text-[#1e293b]">{quotes.length === 0 ? "No quotes yet" : filtering ? "No matching quotes" : "No active quotes"}</h2>
            <p className="mt-1 max-w-[380px] text-[14px] leading-5 text-[#64748b]">
              {quotes.length === 0
                ? customers.length
                  ? "Create your first quote and send it to a customer."
                  : "Add a customer first, then create a quote for them."
                : "Try a different search or clear the filters."}
            </p>
            {quotes.length === 0 && (
              <button
                type="button"
                onClick={() => (customers.length ? setCreating(true) : router.push("/customers?new=1"))}
                className="mt-5 h-10 rounded-lg bg-[#00c185] px-5 text-[14px] font-semibold text-white hover:bg-[#00a873]"
              >
                {customers.length ? "+ Create New Quote" : "+ Add Customer"}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] table-fixed text-left">
              <colgroup>
                {["w-[10.7%]", "w-[8.6%]", "w-[8.6%]", "w-[12.8%]", "w-[6.2%]", "w-[10.3%]", "w-[8.6%]", "w-[13.4%]", "w-[9.2%]", "w-[11.6%]"].map((c, i) => (
                  <col key={i} className={c} />
                ))}
              </colgroup>
              <thead className="bg-[#f8fafc] text-[12px] font-bold uppercase leading-[18px] tracking-[0.6px] text-[#64748b]">
                <tr className="h-[60px] border-b border-[#e2e8f0]">
                  <th className="pl-6">Quote Number</th>
                  <th className="pl-3">Customer</th>
                  <th className="pl-3">Amount</th>
                  <th className="pl-6">Required Deposit</th>
                  <th className="text-center">Status</th>
                  <th className="pl-6">Created Date</th>
                  <th className="pl-3">Sent Date</th>
                  <th className="pl-8">Expiration Date</th>
                  <th className="pl-3">Linked Job</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[14px] leading-[22px] text-[#475569]">
                {filtered.map((q) => (
                  <tr key={q.id} className="h-[72px] border-b border-[#e2e8f0] last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="pl-6 pr-2">
                      <Link href={`/quotes/${q.id}`} className="text-[16px] font-semibold leading-6 text-[#334155] hover:text-[#00c185]">
                        {q.number}
                      </Link>
                    </td>
                    <td className="truncate px-3 text-[15px]" title={q.customer}>{q.customer}</td>
                    <td className="px-3 text-[15px]">{formatMoney(q.total)}</td>
                    <td className="pl-6 pr-3 text-[15px]">{formatMoney(q.deposit)}</td>
                    <td className="text-center">
                      <QuoteStatusBadge state={q.state} />
                    </td>
                    <td className="pl-6 pr-2">{day(q.createdAt)}</td>
                    <td className="px-3">{day(q.sentAt)}</td>
                    <td className="pl-8 pr-2">{q.state === "draft" ? "—" : dateOnly(q.expiresOn)}</td>
                    <td className="px-3 text-[#64748b]">
                      {q.job ? (
                        <Link href={`/jobs/${q.job.id}`} className="hover:text-[#00c185]">{q.job.number}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-center">
                      <Link href={`/quotes/${q.id}`} aria-label={`View ${q.number}`} className="inline-block rounded p-1 transition-opacity hover:opacity-70">
                        <Image src="/customers/eye.svg" alt="" width={24} height={24} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && (
        <QuoteFormModal
          customers={customers}
          defaults={defaults}
          defaultCustomer={newForCustomer}
          onClose={closeNew}
          onSaved={(id, send) => {
            setCreating(false);
            router.push(send ? `/quotes/${id}?send=1` : `/quotes/${id}`);
          }}
        />
      )}
    </div>
  );
}
